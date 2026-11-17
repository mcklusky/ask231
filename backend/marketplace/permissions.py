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
