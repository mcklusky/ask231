from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .chat_serializers import ConversationSerializer, MessageCreateSerializer, MessageSerializer
from .models import Advertisement, Conversation, Message


class ConversationListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        conversations = Conversation.objects.filter(Q(buyer=request.user) | Q(seller=request.user)).select_related(
            "advertisement", "buyer", "seller", "buyer__seller_profile", "seller__seller_profile"
        ).prefetch_related("advertisement__images")
        data = ConversationSerializer(conversations, many=True, context={"request": request}).data
        return Response(data)

    def post(self, request):
        advertisement_slug = request.data.get("advertisement_slug", "")
        if not isinstance(advertisement_slug, str) or not advertisement_slug.strip():
            raise serializers.ValidationError({"advertisement_slug": "Choose a listing to message about."})
        advertisement = get_object_or_404(Advertisement, slug=advertisement_slug.strip(), status=Advertisement.Status.ACTIVE)
        if advertisement.seller_id == request.user.id:
            raise serializers.ValidationError({"detail": "You cannot start a conversation on your own listing."})
        conversation, created = Conversation.objects.get_or_create(
            advertisement=advertisement,
            buyer=request.user,
            defaults={"seller": advertisement.seller},
        )
        data = ConversationSerializer(conversation, context={"request": request}).data
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ConversationMessagesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_conversation(self, request, conversation_id):
        return get_object_or_404(
            Conversation.objects.select_related("advertisement", "buyer", "seller"),
            Q(pk=conversation_id) & (Q(buyer=request.user) | Q(seller=request.user)),
        )

    def get(self, request, conversation_id):
        conversation = self.get_conversation(request, conversation_id)
        Message.objects.filter(conversation=conversation, read_at__isnull=True).exclude(sender=request.user).update(read_at=timezone.now())
        messages = conversation.messages.select_related("sender", "sender__seller_profile").all()
        return Response(MessageSerializer(messages, many=True, context={"request": request}).data)

    def post(self, request, conversation_id):
        conversation = self.get_conversation(request, conversation_id)
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = Message.objects.create(conversation=conversation, sender=request.user, body=serializer.validated_data["body"])
        conversation.save(update_fields=["updated_at"])
        return Response(MessageSerializer(message, context={"request": request}).data, status=status.HTTP_201_CREATED)
