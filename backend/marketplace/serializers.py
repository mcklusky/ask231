from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.fields import IntegerField
from .images import process_listing_photo
from .models import Advertisement, AdvertisementImage, Category, County, SubCategory, Town, default_country, is_abroad


class SubCategorySerializer(serializers.ModelSerializer):
    ad_count = IntegerField(source="active_ad_count", read_only=True, default=0)
    class Meta:
        model = SubCategory
        fields = ["id", "name", "slug", "is_active", "sort_order", "ad_count"]
        read_only_fields = ["slug"]


class CategorySerializer(serializers.ModelSerializer):
    ad_count = IntegerField(source="active_ad_count", read_only=True, default=0)
    subcategories = SubCategorySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "icon", "is_active", "sort_order", "subcategories", "ad_count"]
        read_only_fields = ["slug"]


class CountySerializer(serializers.ModelSerializer):
    class Meta:
        model = County
        fields = ["id", "name", "slug"]


class TownSerializer(serializers.ModelSerializer):
    county_name = serializers.CharField(source="county.name", read_only=True)
    class Meta:
        model = Town
        fields = ["id", "name", "slug", "county", "county_name"]


class AdvertisementImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    class Meta:
        model = AdvertisementImage
        fields = ["id", "image_url", "thumbnail_url", "width", "height", "alt_text", "sort_order", "created_at"]

    def _absolute(self, url):
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url

    def get_image_url(self, obj):
        return self._absolute(obj.image.url)

    def get_thumbnail_url(self, obj):
        # Photos uploaded before thumbnails existed fall back to the full image.
        return self._absolute((obj.thumbnail or obj.image).url)


class AdvertisementSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=Category.objects.filter(is_active=True), write_only=True)
    subcategory = SubCategorySerializer(read_only=True)
    subcategory_id = serializers.PrimaryKeyRelatedField(source="subcategory", queryset=SubCategory.objects.filter(is_active=True), write_only=True)
    county = CountySerializer(read_only=True)
    county_id = serializers.PrimaryKeyRelatedField(source="county", queryset=County.objects.filter(is_active=True), write_only=True, required=False, allow_null=True)
    town = TownSerializer(read_only=True)
    town_id = serializers.PrimaryKeyRelatedField(source="town", queryset=Town.objects.filter(is_active=True), write_only=True, required=False, allow_null=True)
    images = AdvertisementImageSerializer(many=True, read_only=True)
    image_uploads = serializers.ListField(child=serializers.ImageField(), write_only=True, required=False, allow_empty=True)
    seller_name = serializers.SerializerMethodField()
    seller_verified = serializers.SerializerMethodField()
    seller_phone_verified = serializers.SerializerMethodField()
    currency = serializers.RegexField(r"^[A-Z]{3}$", max_length=3)
    country = serializers.CharField(max_length=100, default=default_country)
    ships_from_abroad = serializers.BooleanField(read_only=True)
    phone_number = serializers.RegexField(r"^\+?[0-9][0-9 ()-]{5,18}[0-9]$", max_length=20)
    whatsapp_number = serializers.RegexField(r"^\+?[0-9][0-9 ()-]{5,18}[0-9]$", max_length=20, required=False, allow_blank=True)

    class Meta:
        model = Advertisement
        fields = ["id", "slug", "title", "description", "price", "currency", "condition", "status", "rejection_reason", "phone_number", "whatsapp_number", "views_count", "category", "category_id", "subcategory", "subcategory_id", "country", "ships_from_abroad", "shipping_details", "region", "city", "landmark", "job_type", "pay_period", "how_to_apply", "county", "county_id", "town", "town_id", "images", "image_uploads", "seller_name", "seller_verified", "seller_phone_verified", "created_at", "updated_at", "expires_at"]
        read_only_fields = ["id", "slug", "status", "rejection_reason", "views_count", "seller_name", "seller_verified", "seller_phone_verified", "created_at", "updated_at", "expires_at"]

    def get_seller_name(self, obj):
        seller = getattr(obj.seller, "seller_profile", None)
        return (seller.business_name if seller and seller.business_name else f"{obj.seller.first_name} {obj.seller.last_name}".strip()) or f"{settings.SITE_NAME} seller"  # never fall back to the email: it would be public

    def get_seller_phone_verified(self, obj):
        return bool(obj.seller.phone_verified_at)

    def get_seller_verified(self, obj):
        seller = getattr(obj.seller, "seller_profile", None)
        return bool(seller and seller.is_verified)

    def validate_image_uploads(self, files):
        if len(files) > 10:
            raise serializers.ValidationError("You can upload up to 10 images per advertisement.")
        for file in files:
            if file.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("Each image must be 5 MB or smaller.")
            if file.name.rsplit(".", 1)[-1].lower() not in {"jpg", "jpeg", "png", "webp"}:
                raise serializers.ValidationError("Images must be JPG, PNG, or WebP files.")
        # Resize, re-encode as WebP and strip metadata now, so a bad photo fails before anything is saved.
        processed = []
        for file in files:
            try:
                processed.append(process_listing_photo(file))
            except DjangoValidationError as error:
                raise serializers.ValidationError(f"{file.name}: {error.messages[0]}")
        return processed

    def validate(self, attrs):
        category = attrs.get("category", getattr(self.instance, "category", None))
        subcategory = attrs.get("subcategory", getattr(self.instance, "subcategory", None))
        county = attrs.get("county", getattr(self.instance, "county", None))
        town = attrs.get("town", getattr(self.instance, "town", None))
        home = settings.COUNTRY_NAME
        country = attrs.get("country", getattr(self.instance, "country", home)).strip()
        if not country:
            raise serializers.ValidationError({"country": "Choose the country you are selling from."})
        abroad = is_abroad(country)
        attrs["country"] = country if abroad else home  # store the home country with its usual spelling
        if category and subcategory and subcategory.category_id != category.id:
            raise serializers.ValidationError({"subcategory_id": "Choose a subcategory in the selected category."})
        if county and town and town.county_id != county.id:
            raise serializers.ValidationError({"town_id": "Choose a town in the selected county."})
        if not abroad and (not county or not town):
            raise serializers.ValidationError({"county_id": f"Choose a county and town in {home}."})
        if abroad:
            attrs["county"] = None
            attrs["town"] = None
            if not attrs.get("city", getattr(self.instance, "city", "")).strip():
                raise serializers.ValidationError({"city": "Enter a city or town for this location."})
            attrs["shipping_details"] = attrs.get("shipping_details", getattr(self.instance, "shipping_details", "")).strip()
        else:
            attrs["shipping_details"] = ""  # only sellers abroad ship items in
        attrs["landmark"] = attrs.get("landmark", getattr(self.instance, "landmark", "")).strip()
        if category and category.slug == "jobs":
            if not attrs.get("job_type", getattr(self.instance, "job_type", "")):
                raise serializers.ValidationError({"job_type": "Choose the type of job."})
            if not attrs.get("pay_period", getattr(self.instance, "pay_period", "")):
                attrs["pay_period"] = Advertisement.PayPeriod.MONTH
            attrs["condition"] = Advertisement.Condition.NEW  # condition means nothing for a job
        else:
            attrs["job_type"] = attrs["pay_period"] = attrs["how_to_apply"] = ""
        image_count = len(attrs.get("image_uploads", [])) + (self.instance.images.count() if self.instance else 0)
        if image_count > 10:
            raise serializers.ValidationError({"image_uploads": "An advertisement can have up to 10 images."})
        return attrs

    def create(self, validated_data):
        uploads = validated_data.pop("image_uploads", [])
        ad = Advertisement.objects.create(seller=self.context["request"].user, **validated_data)
        AdvertisementImage.objects.bulk_create([AdvertisementImage.from_processed(ad, photo, sort_order=index) for index, photo in enumerate(uploads)])
        return ad

    def update(self, instance, validated_data):
        uploads = validated_data.pop("image_uploads", [])
        for field, value in validated_data.items():
            setattr(instance, field, value)
        # Content edits return an active or rejected advert to moderation.
        instance.status = Advertisement.Status.PENDING
        instance.rejection_reason = ""
        instance.save()
        offset = instance.images.count()
        AdvertisementImage.objects.bulk_create([AdvertisementImage.from_processed(instance, photo, sort_order=offset + index) for index, photo in enumerate(uploads)])
        return instance
