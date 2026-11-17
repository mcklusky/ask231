"""Seller ratings and reviews.

Only a buyer who actually talked to the seller can review them: the review hangs off a
conversation in which the seller replied. One review per conversation, which the buyer
can edit or delete. Staff can hide abusive or fake reviews in the Django admin.
"""
from django.conf import settings
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Advertisement, Conversation, Review
from .permissions import HasVerifiedContact


def reviewer_name(user):
    """First name and last initial ("Musu T."), so reviews feel real without exposing full names."""
    first, last = (user.first_name or "").strip(), (user.last_name or "").strip()
    if not first:
        return f"{settings.SITE_NAME} buyer"
    return f"{first} {last[0]}." if last else first


def seller_rating(seller):
    stats = Review.objects.filter(seller=seller, is_hidden=False).aggregate(average=Avg("rating"), count=Count("id"))
    return {"average": round(stats["average"], 1) if stats["average"] else None, "count": stats["count"]}


def seller_has_replied(conversation):
    return conversation.messages.filter(sender_id=conversation.seller_id).exists()


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    listing_title = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ["id", "rating", "comment", "reviewer_name", "listing_title", "created_at"]
        read_only_fields = fields

    def get_reviewer_name(self, obj):
        return reviewer_name(obj.reviewer)

    def get_listing_title(self, obj):
        return obj.advertisement.title if obj.advertisement else ""


class ReviewWriteSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(max_length=1000, required=False, allow_blank=True, trim_whitespace=True)


class AdvertisementSellerReviewsView(APIView):
    """GET: the rating and latest reviews of the seller behind a listing."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        ad = get_object_or_404(Advertisement.objects.select_related("seller"), Q(slug=slug) & (Q(status=Advertisement.Status.ACTIVE) | Q(seller_id=getattr(request.user, "id", None))))
        reviews = Review.objects.filter(seller=ad.seller, is_hidden=False).select_related("reviewer", "advertisement")[:20]
        return Response({**seller_rating(ad.seller), "reviews": ReviewSerializer(reviews, many=True).data})


class ConversationReviewView(APIView):
    """The buyer's review of the seller in this conversation: GET, PUT (create or edit), DELETE."""
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "PUT":
            return [permissions.IsAuthenticated(), HasVerifiedContact()]
        return super().get_permissions()

    def get_conversation(self, request, conversation_id):
        return get_object_or_404(Conversation, pk=conversation_id, buyer=request.user)

    def get(self, request, conversation_id):
        conversation = self.get_conversation(request, conversation_id)
        review = Review.objects.filter(conversation=conversation).first()
        return Response({"can_review": seller_has_replied(conversation), "review": ReviewSerializer(review).data if review else None})

    def put(self, request, conversation_id):
        conversation = self.get_conversation(request, conversation_id)
        if not seller_has_replied(conversation):
            return Response({"detail": "You can rate the seller once they have replied to you."}, status=status.HTTP_400_BAD_REQUEST)
        data = ReviewWriteSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        review, created = Review.objects.update_or_create(
            conversation=conversation,
            defaults={
                "reviewer": request.user, "seller_id": conversation.seller_id, "advertisement_id": conversation.advertisement_id,
                "rating": data.validated_data["rating"], "comment": data.validated_data.get("comment", ""),
            },
        )
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request, conversation_id):
        conversation = self.get_conversation(request, conversation_id)
        Review.objects.filter(conversation=conversation).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
