from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import serializers
from accounts.models import SellerProfile
from .models import Advertisement, Category, County, Promotion, Report, SubCategory, Town
from .serializers import AdvertisementImageSerializer

User = get_user_model()

class AdminUserSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(source="profile.phone_number", read_only=True, default="")
    login_phone = serializers.CharField(source="phone_number", read_only=True, default="")
    joined_at = serializers.DateTimeField(source="date_joined", read_only=True)
    is_seller = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone_number", "login_phone", "is_active", "is_staff", "email_verified_at", "phone_verified_at", "is_seller", "joined_at"]
        read_only_fields = fields
    def get_is_seller(self, obj):
        return bool(obj.seller_flag)

class AdminSellerSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    is_active = serializers.BooleanField(source="user.is_active", read_only=True)
    phone_number = serializers.CharField(source="user.profile.phone_number", read_only=True, default="")
    listings_count = serializers.SerializerMethodField()
    class Meta:
        model = SellerProfile
        fields = ["id", "user_id", "email", "first_name", "last_name", "phone_number", "business_name", "bio", "is_verified", "verification_requested_at", "is_active", "listings_count", "created_at"]
        read_only_fields = fields
    def get_listings_count(self, obj):
        return obj.listings_total

class AdminAdvertisementSerializer(serializers.ModelSerializer):
    images = AdvertisementImageSerializer(many=True, read_only=True)
    seller_email = serializers.EmailField(source="seller.email", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    county_name = serializers.CharField(source="county.name", read_only=True, allow_null=True)
    town_name = serializers.CharField(source="town.name", read_only=True, allow_null=True)
    class Meta:
        model = Advertisement
        fields = ["id", "slug", "title", "price", "currency", "condition", "status", "rejection_reason", "seller_email", "category_name", "country", "shipping_details", "region", "city", "county_name", "town_name", "views_count", "images", "created_at", "updated_at"]
        read_only_fields = fields

class AdminCategorySerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "icon", "is_active", "sort_order"]
        extra_kwargs = {"slug": {"required": False}}

class AdminSubCategorySerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    class Meta:
        model = SubCategory
        fields = ["id", "name", "slug", "category", "category_name", "is_active", "sort_order"]
        validators = []
        extra_kwargs = {"slug": {"required": False}}
    def validate(self, attrs):
        category = attrs.get("category", getattr(self.instance, "category", None))
        slug = attrs.get("slug") or slugify(attrs.get("name", getattr(self.instance, "name", "")))
        if category and SubCategory.objects.filter(category=category, slug=slug).exclude(pk=getattr(self.instance, "pk", None)).exists():
            raise serializers.ValidationError({"name": "That subcategory already exists in this category."})
        return attrs

class AdminCountySerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)
    class Meta:
        model = County
        fields = ["id", "name", "slug", "is_active"]
        extra_kwargs = {"slug": {"required": False}}

class AdminTownSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)
    county_name = serializers.CharField(source="county.name", read_only=True)
    class Meta:
        model = Town
        fields = ["id", "name", "slug", "county", "county_name", "is_active"]
        validators = []
        extra_kwargs = {"slug": {"required": False}}
    def validate(self, attrs):
        county = attrs.get("county", getattr(self.instance, "county", None))
        slug = attrs.get("slug") or slugify(attrs.get("name", getattr(self.instance, "name", "")))
        if county and Town.objects.filter(county=county, slug=slug).exclude(pk=getattr(self.instance, "pk", None)).exists():
            raise serializers.ValidationError({"name": "That town already exists in this county."})
        return attrs

class AdminReportSerializer(serializers.ModelSerializer):
    reporter_email = serializers.EmailField(source="reporter.email", read_only=True)
    target_title = serializers.CharField(source="advertisement.title", read_only=True, default="")
    target_user_email = serializers.EmailField(source="reported_user.email", read_only=True, default="")
    class Meta:
        model = Report
        fields = ["id", "reporter_email", "advertisement", "reported_user", "target_title", "target_user_email", "reason", "details", "status", "resolution_note", "resolved_by", "created_at", "updated_at"]
        read_only_fields = ["id", "reporter_email", "target_title", "target_user_email", "advertisement", "reported_user", "reason", "details", "resolved_by", "created_at", "updated_at"]

class ReportCreateSerializer(serializers.ModelSerializer):
    advertisement_slug = serializers.SlugRelatedField(source="advertisement", slug_field="slug", queryset=Advertisement.objects.filter(status=Advertisement.Status.ACTIVE), required=False)
    reported_user_id = serializers.PrimaryKeyRelatedField(source="reported_user", queryset=User.objects.filter(is_active=True), required=False)
    class Meta:
        model = Report
        fields = ["advertisement_slug", "reported_user_id", "reason", "details"]
    def validate(self, attrs):
        ad = attrs.get("advertisement")
        user = attrs.get("reported_user")
        if bool(ad) == bool(user):
            raise serializers.ValidationError("Choose exactly one advertisement or user to report.")
        reporter = self.context["request"].user
        if ad and ad.seller_id == reporter.id:
            raise serializers.ValidationError({"advertisement_slug": "You cannot report your own advertisement."})
        if user and user.id == reporter.id:
            raise serializers.ValidationError({"reported_user_id": "You cannot report your own account."})
        pending = Report.objects.filter(reporter=reporter, status__in=[Report.Status.OPEN, Report.Status.REVIEWING])
        if ad and pending.filter(advertisement=ad).exists():
            raise serializers.ValidationError({"detail": "You have already reported this listing. Our team is reviewing it."})
        if user and pending.filter(reported_user=user).exists():
            raise serializers.ValidationError({"detail": "You have already reported this account. Our team is reviewing it."})
        return attrs
    def create(self, validated_data):
        return Report.objects.create(reporter=self.context["request"].user, **validated_data)

class AdminPromotionSerializer(serializers.ModelSerializer):
    advertisement_title = serializers.CharField(source="advertisement.title", read_only=True)
    advertisement_slug = serializers.SlugRelatedField(source="advertisement", slug_field="slug", queryset=Advertisement.objects.all())
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    class Meta:
        model = Promotion
        fields = ["id", "advertisement_slug", "advertisement_title", "kind", "status", "starts_at", "ends_at", "created_by_email", "created_at"]
        read_only_fields = ["id", "advertisement_title", "created_by_email", "created_at"]
    def validate(self, attrs):
        start = attrs.get("starts_at", getattr(self.instance, "starts_at", timezone.now()))
        end = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        if end and end <= start:
            raise serializers.ValidationError({"ends_at": "End time must be after the start time."})
        advertisement = attrs.get("advertisement", getattr(self.instance, "advertisement", None))
        is_new_assignment = not self.instance or advertisement.id != self.instance.advertisement_id
        if advertisement and is_new_assignment and advertisement.status != Advertisement.Status.ACTIVE:
            raise serializers.ValidationError({"advertisement_slug": "Only active advertisements can be promoted."})
        return attrs
