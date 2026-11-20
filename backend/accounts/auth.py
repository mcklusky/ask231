"""Keep accounts that still have to confirm their email address out until they do."""
from rest_framework import status
from rest_framework.exceptions import APIException, AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class EmailNotVerified(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_code = "email_not_verified"
    default_detail = "Please verify your email address before signing in. Open the link we emailed you, or ask for a new one."


class VerifiedTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Sign-in: right password but unconfirmed email -> 403 with code "email_not_verified".

    The answer only differs from a wrong password once the password is correct, so it reveals
    nothing to someone guessing addresses. It includes the email so the page can offer a resend.
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        if self.user.needs_email_verification:
            raise EmailNotVerified({"detail": EmailNotVerified.default_detail, "code": "email_not_verified", "email": self.user.email})
        return data


class VerifiedJWTAuthentication(JWTAuthentication):
    """Rejects API calls from accounts that still need email verification, even with a valid token."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if user.needs_email_verification:
            raise AuthenticationFailed("Please verify your email address first.", code="email_not_verified")
        return user
