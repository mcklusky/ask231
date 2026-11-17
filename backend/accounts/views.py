from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .models import SellerProfile, UserProfile
from .serializers import EmailTokenSerializer, PasswordResetConfirmSerializer, PasswordResetRequestSerializer, ProfileSerializer, RegistrationSerializer

User = get_user_model()
class AuthThrottle(AnonRateThrottle):
    scope = "auth"
class ThrottledTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [AuthThrottle]
class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = [AuthThrottle]
class RegisterView(generics.CreateAPIView):
    serializer_class = RegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthThrottle]
    def perform_create(self, serializer):
        user = serializer.save()
        token = signing.dumps({"user_id": user.pk}, salt="email-verification")
        link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        send_mail("Verify your Liberia Buy & Sell email", f"Verify your email address: {link}", settings.DEFAULT_FROM_EMAIL, [user.email])
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
class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthThrottle]
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"], is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            send_mail("Reset your password", f"Reset your password using this link: {link}", settings.DEFAULT_FROM_EMAIL, [user.email])
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
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated. You can now sign in."})
class VerifyEmailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        token = signing.dumps({"user_id": request.user.pk}, salt="email-verification")
        link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        send_mail("Verify your Liberia Buy & Sell email", f"Verify your email address: {link}", settings.DEFAULT_FROM_EMAIL, [request.user.email])
        return Response({"detail": "Verification email sent."})
class VerifyEmailConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthThrottle]
    def post(self, request):
        serializer = EmailTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = signing.loads(serializer.validated_data["token"], salt="email-verification", max_age=86400)
            user = User.objects.get(pk=payload["user_id"], is_active=True)
        except (signing.BadSignature, signing.SignatureExpired, User.DoesNotExist, KeyError):
            return Response({"detail": "This verification link is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
        user.email_verified_at = timezone.now()
        user.save(update_fields=["email_verified_at"])
        return Response({"detail": "Email verified successfully."})
