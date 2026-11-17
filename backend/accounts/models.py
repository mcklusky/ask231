from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

COUNTY_NAMES = ["Bomi", "Bong", "Gbarpolu", "Grand Bassa", "Grand Cape Mount", "Grand Gedeh", "Grand Kru", "Lofa", "Margibi", "Maryland", "Montserrado", "Nimba", "River Cess", "River Gee", "Sinoe"]
COUNTIES = [(name, name) for name in COUNTY_NAMES]

class UserManager(BaseUserManager):
    use_in_migrations = True
    def get_by_natural_key(self, username):
        # Sign in with an email address or a phone number. Emails are stored lowercase, so match
        # regardless of capitalisation (phones and browsers often capitalise the first letter).
        # Used by both the API sign-in and the Django admin login.
        from .phone import looks_like_phone, normalize_phone
        if looks_like_phone(username):
            try:
                return self.get(phone_number=normalize_phone(username))
            except Exception:
                raise self.model.DoesNotExist
        return self.get(**{f"{self.model.USERNAME_FIELD}__iexact": username})
    def _create_user(self, email, password, **extra_fields):
        if not email and not extra_fields.get("phone_number"):
            raise ValueError("An email address or phone number is required")
        email = self.normalize_email(email).lower() if email else None
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    def create_user(self, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        if not extra_fields["is_staff"] or not extra_fields["is_superuser"]:
            raise ValueError("Superuser must have staff and superuser permissions")
        return self._create_user(email, password, **extra_fields)

class User(AbstractUser):
    username = None
    # A member signs up with an email address, a phone number, or both.
    email = models.EmailField(unique=True, db_index=True, null=True, blank=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    phone_number = models.CharField(max_length=16, unique=True, null=True, blank=True, help_text="Sign-in phone number in international format, e.g. +231770123456.")
    phone_verified_at = models.DateTimeField(null=True, blank=True)
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    @property
    def has_verified_contact(self):
        return bool(self.email_verified_at or self.phone_verified_at)

    def __str__(self):
        return self.email or self.phone_number or f"User {self.pk}"

    def save(self, *args, **kwargs):
        self.email = self.email or None  # blank emails must be NULL so the unique index allows many
        self.phone_number = self.phone_number or None
        super().save(*args, **kwargs)


class PhoneCode(models.Model):
    """A one-time code texted to a phone (stored hashed)."""
    class Purpose(models.TextChoices):
        VERIFY = "verify", "Verify phone"
        RESET = "reset", "Reset password"
    user = models.ForeignKey("User", on_delete=models.CASCADE, null=True, blank=True, related_name="phone_codes")
    phone = models.CharField(max_length=16, db_index=True)
    purpose = models.CharField(max_length=8, choices=Purpose.choices)
    code_hash = models.CharField(max_length=64)
    attempts = models.PositiveSmallIntegerField(default=0)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

class UserProfile(models.Model):
    CURRENCIES = [("LRD", "Liberian Dollar"), ("USD", "US Dollar")]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    phone_number = models.CharField(max_length=20, blank=True)
    country_code = models.CharField(max_length=4, default="+231")
    county = models.CharField(max_length=40, choices=COUNTIES, blank=True)
    town = models.CharField(max_length=100, blank=True)
    preferred_currency = models.CharField(max_length=3, choices=CURRENCIES, default="USD")
    avatar_url = models.URLField(blank=True)
    email_on_new_message = models.BooleanField(default=True, help_text="Email this member when someone sends them a new message.")
    sms_on_new_message = models.BooleanField(default=True, help_text="Text this member (verified phone only) when someone sends them a new message.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class SellerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="seller_profile")
    business_name = models.CharField(max_length=160, blank=True)
    bio = models.TextField(blank=True)
    is_verified = models.BooleanField(default=False)
    verification_requested_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return self.business_name or str(self.user)
