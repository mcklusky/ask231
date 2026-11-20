import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.exceptions import Throttled, ValidationError
from .auth import VerifiedTokenObtainPairSerializer
from .email_verification import VerificationResult, can_send_link, confirm_token, send_verification_email
from .models import PhoneCode, SellerProfile, UserProfile
from .phone import check_code, issue_code, mask_phone, normalize_phone
from .serializers import EmailTokenSerializer, ResendVerificationSerializer, PasswordResetConfirmSerializer, PasswordResetRequestSerializer, PhonePasswordResetSerializer, PhoneSendCodeSerializer, PhoneVerifySerializer, ProfileSerializer, RegistrationSerializer, format_phone, release_unverified_phone

User = get_user_model()
logger = logging.getLogger(__name__)
class AuthThrottle(AnonRateThrottle):
    scope = "auth"
class VerificationEmailThrottle(UserRateThrottle):
    scope = "verification"
class VerificationResendThrottle(AnonRateThrottle):
    scope = "verification_resend"
class ThrottledTokenObtainPairView(TokenObtainPairView):
    serializer_class = VerifiedTokenObtainPairSerializer
    throttle_classes = [AuthThrottle]
class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = [AuthThrottle]
class RegisterView(generics.CreateAPIView):
    serializer_class = RegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthThrottle]
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        email_sent = send_verification_email(user)
        self.text_phone_code(user)
        if email_sent:
            detail = f"Account created. We sent a verification link to {user.email}. Open it to activate your account."
        else:
            detail = "Account created, but we couldn't send the verification email just now. Use Resend email to try again."
        return Response({**serializer.data, "detail": detail, "email_sent": email_sent, "email_verification_required": True}, status=status.HTTP_201_CREATED)
    def text_phone_code(self, user):
        if user.phone_number:
            try:
                issue_code(user.phone_number, PhoneCode.Purpose.VERIFY, user)
            except (Throttled, ValidationError):
                pass  # the account still exists; they can ask for a new code after signing in
class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self):
        UserProfile.objects.get_or_create(user=self.request.user)
        return self.request.user

class SellerVerificationRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        seller, _ = SellerProfile.objects.get_or_create(user=request.user)
        if not seller.is_verified and not seller.verification_requested_at:
            seller.verification_requested_at = timezone.now()
            seller.save(update_fields=["verification_requested_at", "updated_at"])
        return Response({"requested": bool(seller.verification_requested_at), "is_verified": seller.is_verified})
class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        try:
            RefreshToken(request.data.get("refresh", "")).blacklist()
        except (TokenError, AttributeError):
            return Response({"detail": "A valid refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PhoneSendCodeView(APIView):
    """Text a code to the member's phone. Sending a different number starts a change of number."""
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [VerificationEmailThrottle]
    def post(self, request):
        serializer = PhoneSendCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        raw = serializer.validated_data.get("phone_number", "").strip()
        target = normalize_phone(raw) if raw else user.phone_number
        if not target:
            return Response({"phone_number": ["Enter your phone number."]}, status=status.HTTP_400_BAD_REQUEST)
        if target == user.phone_number and user.phone_verified_at:
            return Response({"detail": "Your phone number is already verified."})
        if User.objects.filter(phone_number=target, phone_verified_at__isnull=False).exclude(pk=user.pk).exists():
            return Response({"phone_number": ["Another account already uses this phone number."]}, status=status.HTTP_400_BAD_REQUEST)
        # The member's sign-in number only changes once the code for the new number is confirmed.
        issue_code(target, PhoneCode.Purpose.VERIFY, user)
        return Response({"detail": f"We texted a 6-digit code to {mask_phone(target)}.", "phone": target})


class PhoneVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthThrottle]
    def post(self, request):
        serializer = PhoneVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        entry = PhoneCode.objects.filter(user=user, purpose=PhoneCode.Purpose.VERIFY, used_at__isnull=True).order_by("-created_at").first()
        phone = entry.phone if entry else None
        if not phone or not check_code(phone, PhoneCode.Purpose.VERIFY, serializer.validated_data["code"]):
            return Response({"code": ["That code is wrong or has expired. Ask for a new one."]}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(phone_number=phone, phone_verified_at__isnull=False).exclude(pk=user.pk).exists():
            return Response({"code": ["Another account verified this number first."]}, status=status.HTTP_400_BAD_REQUEST)
        release_unverified_phone(phone, keep_user=user)
        user.phone_number, user.phone_verified_at = phone, timezone.now()
        user.save(update_fields=["phone_number", "phone_verified_at"])
        profile, _ = UserProfile.objects.get_or_create(user=user)
        if not profile.phone_number:
            profile.phone_number = format_phone(phone)
            profile.save(update_fields=["phone_number", "updated_at"])
        user.profile = profile
        return Response(ProfileSerializer(user).data)


class PhonePasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthThrottle]
    def post(self, request):
        serializer = PhonePasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone_number"]
        user = User.objects.filter(phone_number=phone, is_active=True).first()
        if not user or not check_code(phone, PhoneCode.Purpose.RESET, serializer.validated_data["code"]):
            return Response({"code": ["That code is wrong or has expired. Ask for a new one."]}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data["new_password"])
        user.phone_verified_at = user.phone_verified_at or timezone.now()  # receiving the code proves they hold this phone
        user.save(update_fields=["password", "phone_verified_at"])
        return Response({"detail": "Password updated. You can now sign in."})


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthThrottle]
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data.get("phone_number")
        if phone:
            user = User.objects.filter(phone_number=phone, is_active=True).first()
            if user:
                try:
                    issue_code(phone, PhoneCode.Purpose.RESET, user)
                except ValidationError:
                    pass
            # Same answer whether or not the number has an account, so numbers can't be probed.
            return Response({"detail": "If an account uses that number, we have texted it a 6-digit code."})
        user = User.objects.filter(email__iexact=serializer.validated_data["email"], is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            try:
                send_mail("Reset your password", f"Reset your password using this link: {link}", settings.DEFAULT_FROM_EMAIL, [user.email])
            except Exception:  # same answer either way; the failure is logged for staff
                logger.exception("Could not send the password reset email for user %s", user.pk)
        return Response({"detail": "If an account exists for that email, reset instructions have been sent."})
class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthThrottle]
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            decoded_uid = force_str(urlsafe_base64_decode(serializer.validated_data["uid"]))
            user = User.objects.get(pk=decoded_uid, is_active=True)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response({"detail": "This reset link is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
        if not default_token_generator.check_token(user, serializer.validated_data["token"]):
            return Response({"detail": "This reset link is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data["new_password"])
        user.email_verified_at = user.email_verified_at or timezone.now()  # the link reached their inbox
        user.save(update_fields=["password", "email_verified_at"])
        return Response({"detail": "Password updated. You can now sign in."})
class VerifyEmailView(APIView):
    """GET: the signed-in member's email verification status. POST: email them a new link."""
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [VerificationEmailThrottle]
    def get_throttles(self):
        return [] if self.request.method == "GET" else super().get_throttles()
    def get(self, request):
        return Response({"email": request.user.email or "", "email_verified": bool(request.user.email_verified_at)})
    def post(self, request):
        if request.user.email_verified_at:
            return Response({"detail": "Your email address is already verified."})
        if not request.user.email:
            return Response({"detail": "Add an email address first."}, status=status.HTTP_400_BAD_REQUEST)
        if not can_send_link(request.user):
            return Response({"detail": "We sent a link recently. Check your inbox and spam folder, or try again in a few minutes."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        if not send_verification_email(request.user):
            return Response({"detail": "We couldn't send the email just now. Please try again in a few minutes."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({"detail": "Verification email sent."})


class ResendVerificationEmailView(APIView):
    """Signed-out resend. Always gives the same answer, so it can't be used to find out who has an account."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [VerificationResendThrottle]
    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"], is_active=True, email_verified_at__isnull=True).first()
        if user and can_send_link(user):
            send_verification_email(user)
        return Response({"detail": "If that address belongs to an account that still needs verifying, we've sent a new link. Check your inbox and spam folder."})


VERIFY_ERRORS = {
    VerificationResult.INVALID: "This verification link is not valid. Check that you opened the whole link, or ask for a new one.",
    VerificationResult.EXPIRED: "This verification link has expired. Ask for a new one below.",
    VerificationResult.USED: "This verification link has already been used or replaced by a newer one.",
}


class VerifyEmailConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthThrottle]
    def post(self, request):
        serializer = EmailTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result, user = confirm_token(serializer.validated_data["token"])
        if result == VerificationResult.VERIFIED:
            return Response({"detail": "Email verified. You can now sign in.", "code": result})
        body = {"detail": VERIFY_ERRORS[result], "code": result}
        if result == VerificationResult.USED and user is not None and user.email_verified_at:
            body = {"detail": "Your email address is already verified. You can sign in.", "code": "already_verified"}
        return Response(body, status=status.HTTP_400_BAD_REQUEST)
