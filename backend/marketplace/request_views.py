""" "I'm looking for…" requests: buyers say what they need; sellers and service providers reply in chat."""
from datetime import timedelta

from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .chat_serializers import ConversationSerializer, MessageCreateSerializer, public_name
from .models import BuyerRequest, Category, Conversation, County, Message, Town
from .notifications import notify_new_message
from .permissions import HasVerifiedContact


class BuyerRequestSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=Category.objects.filter(is_active=True), write_only=True, required=False, allow_null=True)
    county_id = serializers.PrimaryKeyRelatedField(source="county", queryset=County.objects.filter(is_active=True), write_only=True, required=False, allow_null=True)
    town_id = serializers.PrimaryKeyRelatedField(source="town", queryset=Town.objects.filter(is_active=True), write_only=True, required=False, allow_null=True)
    category = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    requester_name = serializers.SerializerMethodField()
    requester_phone_verified = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()
    responses_count = serializers.SerializerMethodField()
    currency = serializers.RegexField(r"^[A-Z]{3}$", max_length=3, required=False)

    class Meta:
        model = BuyerRequest
        fields = ["id", "title", "description", "category", "category_id", "county_id", "town_id", "location", "budget", "currency", "status",
                  "requester_name", "requester_phone_verified", "is_mine", "responses_count", "created_at", "expires_at"]
        read_only_fields = ["id", "status", "created_at", "expires_at"]

    def get_category(self, obj):
        return {"id": obj.category_id, "name": obj.category.name, "slug": obj.category.slug} if obj.category_id else None

    def get_location(self, obj):
        return ", ".join(part for part in [obj.town.name if obj.town_id else "", obj.county.name if obj.county_id else ""] if part) or "Anywhere in Liberia"

    def get_requester_name(self, obj):
        return public_name(obj.requester)

    def get_requester_phone_verified(self, obj):
        return bool(obj.requester.phone_verified_at)

    def get_is_mine(self, obj):
        user = self.context["request"].user
        return user.is_authenticated and obj.requester_id == user.id

    def get_responses_count(self, obj):
        # Only the person asking sees how many offers came in.
        return getattr(obj, "responses", None) if self.get_is_mine(obj) else None

    def validate(self, attrs):
        title = attrs.get("title", getattr(self.instance, "title", "")).strip()
        if len(title) < 3:
            raise serializers.ValidationError({"title": "Say what you are looking for."})
        attrs["title"] = title
        county, town = attrs.get("county"), attrs.get("town")
        if town and county and town.county_id != county.id:
            raise serializers.ValidationError({"town_id": "Choose a town in the selected county."})
        if town and not county:
            attrs["county"] = town.county
        return attrs


def visible_requests():
    return BuyerRequest.objects.filter(status=BuyerRequest.Status.OPEN, expires_at__gt=timezone.now(), requester__is_active=True)


class BuyerRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = BuyerRequestSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), HasVerifiedContact()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        params = self.request.query_params
        queryset = visible_requests().select_related("requester", "category", "county", "town")
        if q := params.get("q", "").strip():
            queryset = queryset.filter(Q(title__icontains=q) | Q(description__icontains=q) | Q(category__name__icontains=q))
        if category := params.get("category", "").strip():
            queryset = queryset.filter(category__slug=category)
        if county := params.get("county", "").strip():
            queryset = queryset.filter(Q(county__slug=county) | Q(county__isnull=True))
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if visible_requests().filter(requester=user).count() >= BuyerRequest.MAX_OPEN_PER_MEMBER:
            raise serializers.ValidationError({"detail": f"You can have up to {BuyerRequest.MAX_OPEN_PER_MEMBER} open requests. Close one you no longer need first."})
        serializer.save(requester=user)


class MyBuyerRequestsView(generics.ListAPIView):
    serializer_class = BuyerRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return (BuyerRequest.objects.filter(requester=self.request.user).exclude(status=BuyerRequest.Status.HIDDEN)
                .select_related("requester", "category", "county", "town").annotate(responses=Count("conversations")))


class BuyerRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Anyone can view an open request; the owner can close or delete it."""
    serializer_class = BuyerRequestSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        mine = Q(requester=user) & ~Q(status=BuyerRequest.Status.HIDDEN) if user.is_authenticated else Q(pk__in=[])
        base = BuyerRequest.objects.select_related("requester", "category", "county", "town").annotate(responses=Count("conversations"))
        if self.request.method in permissions.SAFE_METHODS:
            return base.filter(Q(pk__in=visible_requests().values("pk")) | mine)
        return base.filter(mine)

    def update(self, request, *args, **kwargs):
        # Owners can only close or reopen; to change the wording, close it and post a new one.
        instance = self.get_object()
        new_status = request.data.get("status")
        if new_status not in (BuyerRequest.Status.OPEN, BuyerRequest.Status.CLOSED):
            return Response({"status": ["Use \"open\" or \"closed\"."]}, status=status.HTTP_400_BAD_REQUEST)
        instance.status = new_status
        if new_status == BuyerRequest.Status.OPEN and instance.expires_at <= timezone.now():
            instance.expires_at = timezone.now() + timedelta(days=BuyerRequest.LIFETIME_DAYS)
        instance.save(update_fields=["status", "expires_at", "updated_at"])
        return Response(self.get_serializer(instance).data)


class BuyerRequestRespondView(APIView):
    """Reply to a request: opens (or reuses) a private chat with the person asking."""
    permission_classes = [permissions.IsAuthenticated, HasVerifiedContact]

    def post(self, request, pk):
        buyer_request = get_object_or_404(visible_requests().select_related("requester"), pk=pk)
        if buyer_request.requester_id == request.user.id:
            return Response({"detail": "This is your own request."}, status=status.HTTP_400_BAD_REQUEST)
        body = MessageCreateSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        with transaction.atomic():
            conversation, _ = Conversation.objects.get_or_create(request=buyer_request, seller=request.user, defaults={"buyer": buyer_request.requester})
            message = Message.objects.create(conversation=conversation, sender=request.user, body=body.validated_data["body"])
            conversation.save(update_fields=["updated_at"])
            notify_new_message(message)
        return Response(ConversationSerializer(conversation, context={"request": request}).data, status=status.HTTP_201_CREATED)
