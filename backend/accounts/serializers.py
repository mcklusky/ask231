from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from .models import COUNTIES, SellerProfile, User, UserProfile

class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    seller_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "password", "phone_number", "seller_name"]
    @transaction.atomic
    def create(self, validated_data):
        phone = validated_data.pop("phone_number", "")
        seller_name = validated_data.pop("seller_name", "")
        user = User.objects.create_user(password=validated_data.pop("password"), **validated_data)
        UserProfile.objects.create(user=user, phone_number=phone)
        if seller_name:
            SellerProfile.objects.create(user=user, business_name=seller_name)
        return user

class ProfileSerializer(serializers.ModelSerializer):
    is_staff = serializers.BooleanField(read_only=True)
    phone_number = serializers.CharField(source="profile.phone_number", required=False, allow_blank=True)
    country_code = serializers.CharField(source="profile.country_code", read_only=True)
    county = serializers.ChoiceField(source="profile.county", choices=COUNTIES, required=False, allow_blank=True)
    town = serializers.CharField(source="profile.town", required=False, allow_blank=True)
    preferred_currency = serializers.ChoiceField(source="profile.preferred_currency", choices=UserProfile.CURRENCIES, required=False)
    email_verified = serializers.SerializerMethodField()
    seller_profile = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "email_verified", "is_staff", "phone_number", "country_code", "county", "town", "preferred_currency", "seller_profile"]
        read_only_fields = ["id", "email", "email_verified", "is_staff"]
    def get_email_verified(self, obj):
        return bool(obj.email_verified_at)
    def get_seller_profile(self, obj):
        if not hasattr(obj, "seller_profile"):
            return None
        return {"business_name": obj.seller_profile.business_name, "bio": obj.seller_profile.bio, "is_verified": obj.seller_profile.is_verified, "verification_requested": bool(obj.seller_profile.verification_requested_at)}
    @transaction.atomic
    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for field, value in profile_data.items():
            setattr(profile, field, value)
        profile.save()
        return instance

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)
    def validate_new_password(self, value):
        from django.contrib.auth import password_validation
        try:
            password_validation.validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value
class EmailTokenSerializer(serializers.Serializer):
    token = serializers.CharField()
