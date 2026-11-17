from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import SellerProfile, User, UserProfile
@admin.register(User)
class MarketplaceUserAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "is_staff", "email_verified_at")
    fieldsets = ((None, {"fields": ("email", "password")}), ("Personal info", {"fields": ("first_name", "last_name", "email_verified_at")}), ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}), ("Important dates", {"fields": ("last_login", "date_joined")}))
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "password1", "password2")}),)
    search_fields = ("email", "first_name", "last_name")
admin.site.register(UserProfile)
admin.site.register(SellerProfile)
