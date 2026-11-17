from rest_framework import serializers

from .models import Conversation, Message


def public_name(user):
    profile = getattr(user, "seller_profile", None)
    if profile and profile.business_name:
        return profile.business_name
    name = f"{user.first_name} {user.last_name}".strip()
    return name or "MarketDay member"


class ConversationSerializer(serializers.ModelSerializer):
    advertisement_slug = serializers.CharField(source="advertisement.slug", read_only=True)
    listing_title = serializers.CharField(source="advertisement.title", read_only=True)
    listing_image_url = serializers.SerializerMethodField()
    other_user_name = serializers.SerializerMethodField()
    other_user_verified = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["id", "advertisement_slug", "listing_title", "listing_image_url", "other_user_name", "other_user_verified", "last_message", "unread_count", "updated_at"]

    def get_other_user(self, obj):
        user = self.context["request"].user
        return obj.seller if obj.buyer_id == user.id else obj.buyer

    def get_other_user_name(self, obj):
        return public_name(self.get_other_user(obj))

    def get_other_user_verified(self, obj):
        profile = getattr(self.get_other_user(obj), "seller_profile", None)
        return bool(profile and profile.is_verified)

    def get_listing_image_url(self, obj):
        image = obj.advertisement.images.first()
        if not image:
            return None
        try:
            request = self.context.get("request")
            url = (image.thumbnail or image.image).url  # small copy for the inbox
            return request.build_absolute_uri(url) if request else url
        except ValueError:
            return None

    def get_last_message(self, obj):
        message = obj.messages.order_by("-created_at", "-id").first()
        return message.body if message else "Conversation started"

    def get_unread_count(self, obj):
        user = self.context["request"].user
        return obj.messages.filter(read_at__isnull=True).exclude(sender=user).count()


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "sender_name", "is_mine", "body", "created_at", "read_at"]
        read_only_fields = fields

    def get_sender_name(self, obj):
        return public_name(obj.sender)

    def get_is_mine(self, obj):
        return obj.sender_id == self.context["request"].user.id


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=4000, trim_whitespace=True)

    def validate_body(self, value):
        if not value.strip():
            raise serializers.ValidationError("Write a message before sending.")
        return value.strip()
