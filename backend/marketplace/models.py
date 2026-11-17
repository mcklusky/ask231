import os
import uuid
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django.utils.text import slugify


class County(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Town(models.Model):
    county = models.ForeignKey(County, on_delete=models.PROTECT, related_name="towns")
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=110)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["county", "slug"], name="unique_town_slug_per_county")]
        indexes = [models.Index(fields=["county", "is_active"])]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name}, {self.county.name}"


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=110, unique=True)
    description = models.CharField(max_length=240, blank=True)
    icon = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class SubCategory(models.Model):
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="subcategories")
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=110)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [models.UniqueConstraint(fields=["category", "slug"], name="unique_subcategory_slug_per_category")]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.category.name} / {self.name}"


class Advertisement(models.Model):
    class Condition(models.TextChoices):
        NEW = "new", "New"
        USED = "used", "Used"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        REJECTED = "rejected", "Rejected"
        SOLD = "sold", "Sold"
        EXPIRED = "expired", "Expired"
        SUSPENDED = "suspended", "Suspended"

    class JobType(models.TextChoices):
        FULL_TIME = "full_time", "Full-time"
        PART_TIME = "part_time", "Part-time"
        CONTRACT = "contract", "Contract"
        TEMPORARY = "temporary", "Temporary or daily work"
        INTERNSHIP = "internship", "Internship"
        VOLUNTEER = "volunteer", "Volunteer"

    class PayPeriod(models.TextChoices):
        MONTH = "month", "per month"
        WEEK = "week", "per week"
        DAY = "day", "per day"
        HOUR = "hour", "per hour"
        JOB = "job", "for the job"

    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="advertisements")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="advertisements")
    subcategory = models.ForeignKey(SubCategory, on_delete=models.PROTECT, related_name="advertisements")
    county = models.ForeignKey(County, on_delete=models.PROTECT, related_name="advertisements", null=True, blank=True)
    town = models.ForeignKey(Town, on_delete=models.PROTECT, related_name="advertisements", null=True, blank=True)
    country = models.CharField(max_length=100, default="Liberia")
    # Many places have no street address; people find them by landmark ("behind Total station, Red Light").
    landmark = models.CharField(max_length=120, blank=True)
    # Jobs category only: the price is the pay.
    job_type = models.CharField(max_length=12, choices=JobType.choices, blank=True)
    pay_period = models.CharField(max_length=8, choices=PayPeriod.choices, blank=True)
    how_to_apply = models.CharField(max_length=500, blank=True)
    facebook_post_id = models.CharField(max_length=80, blank=True, editable=False, help_text="Set once the ad has been posted to the site's Facebook page.")
    region = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    title = models.CharField(max_length=140)
    slug = models.SlugField(max_length=180, unique=True, blank=True)
    description = models.TextField(max_length=10000)
    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    currency = models.CharField(max_length=3, default="LRD")
    condition = models.CharField(max_length=8, choices=Condition.choices)
    phone_number = models.CharField(max_length=20)
    whatsapp_number = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    rejection_reason = models.CharField(max_length=240, blank=True)
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "created_at"]), models.Index(fields=["category", "status"]), models.Index(fields=["county", "town", "status"])]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = f"{slugify(self.title)[:165]}-{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)

    def clean(self):
        errors = {}
        if self.subcategory_id and self.category_id and self.subcategory.category_id != self.category_id:
            errors["subcategory"] = "Choose a subcategory that belongs to the selected category."
        if self.town_id and self.county_id and self.town.county_id != self.county_id:
            errors["town"] = "Choose a town in the selected county."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return self.title


class BuyerRequest(models.Model):
    """ "I'm looking for…": a member describes what they need and sellers or service providers reply."""
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        CLOSED = "closed", "Found / closed"
        HIDDEN = "hidden", "Hidden by staff"

    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="buyer_requests")
    title = models.CharField(max_length=120)
    description = models.TextField(max_length=2000, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="buyer_requests")
    county = models.ForeignKey(County, on_delete=models.PROTECT, null=True, blank=True, related_name="buyer_requests")
    town = models.ForeignKey(Town, on_delete=models.PROTECT, null=True, blank=True, related_name="buyer_requests")
    budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0.01"))])
    currency = models.CharField(max_length=3, default="USD")
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.OPEN, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(db_index=True)

    LIFETIME_DAYS = 30
    MAX_OPEN_PER_MEMBER = 10

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=self.LIFETIME_DAYS)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Looking for: {self.title}"


class Conversation(models.Model):
    # A chat is about either a listing (buyer -> seller) or a "looking for" request
    # (buyer = the person asking, seller = the person offering).
    advertisement = models.ForeignKey(Advertisement, on_delete=models.CASCADE, related_name="conversations", null=True, blank=True)
    request = models.ForeignKey(BuyerRequest, on_delete=models.CASCADE, related_name="conversations", null=True, blank=True)
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="buyer_conversations")
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="seller_conversations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(fields=["advertisement", "buyer"], name="unique_ad_buyer_conversation"),
            models.UniqueConstraint(fields=["request", "seller"], name="unique_request_responder_conversation"),
            models.CheckConstraint(condition=models.Q(advertisement__isnull=False) | models.Q(request__isnull=False), name="conversation_has_subject"),
        ]

    @property
    def subject_title(self):
        if self.advertisement_id:
            return self.advertisement.title
        return f"Looking for: {self.request.title}" if self.request_id else "Conversation"

    def __str__(self):
        return f"{self.subject_title}: {self.buyer_id} ↔ {self.seller_id}"


class Favorite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites")
    advertisement = models.ForeignKey(Advertisement, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["user", "advertisement"], name="unique_user_favorite_ad")]


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_messages")
    body = models.TextField(max_length=4000)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [models.Index(fields=["conversation", "created_at"], name="chat_conv_created_idx")]

    def __str__(self):
        return f"Message {self.pk} in conversation {self.conversation_id}"


def advertisement_image_path(instance, filename):
    extension = os.path.splitext(filename)[1].lower()[:8]
    return f"advertisements/{instance.advertisement_id}/{uuid.uuid4().hex}{extension}"


def advertisement_thumbnail_path(instance, filename):
    extension = os.path.splitext(filename)[1].lower()[:8]
    return f"advertisements/{instance.advertisement_id}/thumbs/{uuid.uuid4().hex}{extension}"


def validate_image_size(file):
    if file.size > 5 * 1024 * 1024:
        raise ValidationError("Each image must be 5 MB or smaller.")


class AdvertisementImage(models.Model):
    advertisement = models.ForeignKey(Advertisement, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to=advertisement_image_path, validators=[FileExtensionValidator(["jpg", "jpeg", "png", "webp"]), validate_image_size])
    # Small copy for cards, inboxes and galleries (see marketplace/images.py).
    thumbnail = models.ImageField(upload_to=advertisement_thumbnail_path, blank=True)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    alt_text = models.CharField(max_length=140, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "created_at"]

    def __str__(self):
        return f"Image for {self.advertisement.title}"

    @classmethod
    def from_processed(cls, advertisement, processed, sort_order=0, alt_text=""):
        """Build (unsaved) an image from marketplace.images.process_listing_photo() output."""
        return cls(advertisement=advertisement, image=processed.display, thumbnail=processed.thumbnail,
                   width=processed.width, height=processed.height, sort_order=sort_order, alt_text=alt_text)

@receiver(pre_delete, sender=AdvertisementImage)
def remove_advertisement_image_file(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)
    if instance.thumbnail:
        instance.thumbnail.delete(save=False)


class Report(models.Model):
    class Reason(models.TextChoices):
        SCAM = "scam", "Possible scam or fraud"
        PROHIBITED = "prohibited", "Prohibited item"
        MISLEADING = "misleading", "Misleading information"
        HARASSMENT = "harassment", "Harassment or abuse"
        OTHER = "other", "Other"
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        REVIEWING = "reviewing", "Reviewing"
        RESOLVED = "resolved", "Resolved"
        DISMISSED = "dismissed", "Dismissed"

    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="submitted_reports")
    advertisement = models.ForeignKey(Advertisement, on_delete=models.CASCADE, null=True, blank=True, related_name="reports")
    reported_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="reports_against")
    reason = models.CharField(max_length=20, choices=Reason.choices)
    details = models.TextField(max_length=2000, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN, db_index=True)
    resolution_note = models.CharField(max_length=500, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="resolved_reports")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.CheckConstraint(condition=(models.Q(advertisement__isnull=False, reported_user__isnull=True) | models.Q(advertisement__isnull=True, reported_user__isnull=False)), name="report_has_exactly_one_target")]

    def __str__(self):
        return f"Report #{self.pk} - {self.get_status_display()}"


class Promotion(models.Model):
    class Kind(models.TextChoices):
        FEATURED = "featured", "Featured"
        SPONSORED = "sponsored", "Sponsored"
        TOP = "top", "Top listing"
        URGENT = "urgent", "Urgent"
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        ACTIVE = "active", "Active"
        ENDED = "ended", "Ended"
        CANCELLED = "cancelled", "Cancelled"

    advertisement = models.ForeignKey(Advertisement, on_delete=models.CASCADE, related_name="promotions")
    kind = models.CharField(max_length=12, choices=Kind.choices)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_promotions")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "ends_at"])]

    def __str__(self):
        return f"{self.get_kind_display()} - {self.advertisement.title}"


class Review(models.Model):
    """A buyer's rating of a seller, left from a real conversation where the seller replied."""
    conversation = models.OneToOneField(Conversation, on_delete=models.CASCADE, related_name="review")
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_written")
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_received")
    advertisement = models.ForeignKey(Advertisement, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviews")
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(max_length=1000, blank=True)
    is_hidden = models.BooleanField(default=False, help_text="Hidden by staff (abusive or fake). Hidden reviews do not count.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["seller", "is_hidden"], name="review_seller_visible_idx")]

    def __str__(self):
        return f"{self.rating}★ for user {self.seller_id}"
