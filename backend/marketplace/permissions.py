from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsOwnerOrActiveReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return obj.status == "active" or obj.seller_id == request.user.id or bool(request.user and request.user.is_staff)
        return obj.seller_id == request.user.id or bool(request.user and request.user.is_staff)

class IsStaffOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or bool(request.user and request.user.is_staff)

class HasVerifiedEmail(BasePermission):
    """Posting ads and messaging require a confirmed email address (staff are exempt)."""
    message = "Verify your email address before posting ads or messaging sellers. You can resend the verification link from your account page."
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_staff or user.email_verified_at))
