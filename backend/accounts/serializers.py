from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers
from .models import COUNTIES, SellerProfile, User, UserProfile
from .phone import normalize_phone

class RegistrationSerializer(serializers.ModelSerializer):
    """Sign up with an email address (required, confirmed before first sign-in) and optionally a phone number."""
    email = serializers.EmailField(error_messages={"required": "Enter your email address.", "blank": "Enter your email address."})
    password = serializers.CharField(write_only=True, validators=[validate_password])
    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    seller_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "password", "phone_number", "seller_name"]
    def validate_email(self, value):
        value = (value or "").strip().lower()
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return value
    def validate_phone_number(self, value):
        if not (value or "").strip():
            return ""
        phone = normalize_phone(value)
        if User.objects.filter(phone_number=phone, phone_verified_at__isnull=False).exists():
            raise serializers.ValidationError("An account with this phone number already exists. Sign in or reset your password.")
        return phone
    def create(self, validated_data):
        try:
            return self._create(validated_data)
        except IntegrityError:  # two sign-ups with the same address at the same moment
            raise serializers.ValidationError({"email": ["An account with this email address already exists."]})
    @transaction.atomic
    def _create(self, validated_data):
        phone = validated_data.pop("phone_number", "")
        seller_name = validated_data.pop("seller_name", "")
        if phone:
            release_unverified_phone(phone)
        user = User.objects.create_user(password=validated_data.pop("password"), phone_number=phone or None, email_verification_required=True, **validated_data)
        UserProfile.objects.create(user=user, phone_number=format_phone(phone) if phone else "")
        if seller_name:
            SellerProfile.objects.create(user=user, business_name=seller_name)
        return user


def release_unverified_phone(phone, keep_user=None):
    """A number belongs to whoever proves it by SMS; unproven claims by other accounts are dropped."""
    User.objects.filter(phone_number=phone, phone_verified_at__isnull=True).exclude(pk=getattr(keep_user, "pk", None)).update(phone_number=None)


def format_phone(phone):
    """+231770123456 -> +231 770 123 456 (how the app shows and pre-fills numbers)."""
    if phone.startswith("+231") and len(phone) == 13:
        return f"+231 {phone[4:7]} {phone[7:10]} {phone[10:]}"
    return phone

class ProfileSerializer(serializers.ModelSerializer):
    is_staff = serializers.BooleanField(read_only=True)
    phone_number = serializers.CharField(source="profile.phone_number", required=False, allow_blank=True)
    country_code = serializers.CharField(source="profile.country_code", read_only=True)
    county = serializers.ChoiceField(source="profile.county", choices=COUNTIES, required=False, allow_blank=True)
    town = serializers.CharField(source="profile.town", required=False, allow_blank=True)
    preferred_currency = serializers.ChoiceField(source="profile.preferred_currency", choices=UserProfile.CURRENCIES, required=False)
    email_on_new_message = serializers.BooleanField(source="profile.email_on_new_message", required=False)
    sms_on_new_message = serializers.BooleanField(source="profile.sms_on_new_message", required=False)
    login_phone = serializers.CharField(source="phone_number", read_only=True, default="")
    phone_verified = serializers.SerializerMethodField()
    email_verified = serializers.SerializerMethodField()
    seller_profile = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "email_verified", "is_staff", "phone_number", "country_code", "county", "town", "preferred_currency", "email_on_new_message", "sms_on_new_message", "login_phone", "phone_verified", "seller_profile"]
        read_only_fields = ["id", "email", "email_verified", "is_staff"]
    def get_email_verified(self, obj):
        return bool(obj.email_verified_at)
    def get_phone_verified(self, obj):
        return bool(obj.phone_verified_at)
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["email"] = data.get("email") or ""
        data["login_phone"] = data.get("login_phone") or ""
        return data
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
        instance.profile = profile  # replace any stale cached copy so the response shows the saved values
        return instance

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    def validate(self, attrs):
        if attrs.get("phone_number"):
            attrs["phone_number"] = normalize_phone(attrs["phone_number"])
        elif not attrs.get("email"):
            raise serializers.ValidationError({"email": "Enter your email address or phone number."})
        return attrs
class PhoneSendCodeSerializer(serializers.Serializer):
    phone_number = serializers.CharField(required=False, allow_blank=True)
class PhoneVerifySerializer(serializers.Serializer):
    code = serializers.CharField(max_length=12)
class PhonePasswordResetSerializer(serializers.Serializer):
    phone_number = serializers.CharField()
    code = serializers.CharField(max_length=12)
    new_password = serializers.CharField(write_only=True)
    def validate_phone_number(self, value):
        return normalize_phone(value)
    def validate_new_password(self, value):
        from django.contrib.auth import password_validation
        try:
            password_validation.validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value
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
    token = serializers.CharField(max_length=200)
class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
