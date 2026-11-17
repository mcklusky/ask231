from django.contrib import admin
from . import facebook
from .models import Advertisement, AdvertisementImage, Category, County, BuyerRequest, Promotion, Report, Review, SubCategory, Town

class SubCategoryInline(admin.TabularInline):
    model = SubCategory
    extra = 0
    fields = ("name", "slug", "is_active", "sort_order")
    prepopulated_fields = {"slug": ("name",)}

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "sort_order")
    list_filter = ("is_active",)
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    inlines = (SubCategoryInline,)
    actions = ("activate_categories", "deactivate_categories")
    @admin.action(description="Deactivate selected categories")
    def deactivate_categories(self, request, queryset):
        queryset.update(is_active=False)
    @admin.action(description="Activate selected categories")
    def activate_categories(self, request, queryset):
        queryset.update(is_active=True)
    def delete_model(self, request, obj):
        obj.is_active = False
        obj.save(update_fields=("is_active", "updated_at"))
    def delete_queryset(self, request, queryset):
        queryset.update(is_active=False)

@admin.register(SubCategory)
class SubCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "is_active", "sort_order")
    list_filter = ("category", "is_active")
    search_fields = ("name", "category__name")
    prepopulated_fields = {"slug": ("name",)}
    actions = ("activate_subcategories", "deactivate_subcategories")
    @admin.action(description="Deactivate selected subcategories")
    def deactivate_subcategories(self, request, queryset):
        queryset.update(is_active=False)
    @admin.action(description="Activate selected subcategories")
    def activate_subcategories(self, request, queryset):
        queryset.update(is_active=True)
    def delete_model(self, request, obj):
        obj.is_active = False
        obj.save(update_fields=("is_active", "updated_at"))
    def delete_queryset(self, request, queryset):
        queryset.update(is_active=False)

@admin.register(County)
class CountyAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)

@admin.register(Town)
class TownAdmin(admin.ModelAdmin):
    list_display = ("name", "county", "is_active")
    list_filter = ("county", "is_active")
    search_fields = ("name", "county__name")
    prepopulated_fields = {"slug": ("name",)}

class AdvertisementImageInline(admin.TabularInline):
    model = AdvertisementImage
    extra = 0
    readonly_fields = ("created_at",)

@admin.action(description="Approve selected advertisements")
def approve_advertisements(modeladmin, request, queryset):
    newly_active = list(queryset.exclude(status=Advertisement.Status.ACTIVE))
    queryset.update(status=Advertisement.Status.ACTIVE, rejection_reason="")
    facebook.announce_approved(newly_active)

@admin.action(description="Reject selected advertisements")
def reject_advertisements(modeladmin, request, queryset):
    queryset.update(status=Advertisement.Status.REJECTED)

@admin.register(Advertisement)
class AdvertisementAdmin(admin.ModelAdmin):
    list_display = ("title", "seller", "category", "country", "city", "county", "price", "currency", "status", "created_at")
    list_filter = ("status", "category", "country", "county", "condition", "currency")
    search_fields = ("title", "description", "country", "region", "city", "seller__email", "seller__first_name")
    readonly_fields = ("slug", "views_count", "created_at", "updated_at")
    fields = ("seller", "category", "subcategory", "country", "region", "city", "county", "town", "title", "slug", "description", "price", "currency", "condition", "phone_number", "whatsapp_number", "status", "rejection_reason", "views_count", "created_at", "updated_at", "expires_at")
    inlines = (AdvertisementImageInline,)
    actions = (approve_advertisements, reject_advertisements)

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("id", "reason", "reporter", "advertisement", "reported_user", "status", "created_at")
    list_filter = ("status", "reason", "created_at")
    search_fields = ("reporter__email", "advertisement__title", "reported_user__email", "details")
    readonly_fields = ("reporter", "advertisement", "reported_user", "reason", "details", "created_at", "updated_at")
    actions = ("mark_reviewing", "resolve_reports", "dismiss_reports")
    @admin.action(description="Mark selected reports as reviewing")
    def mark_reviewing(self, request, queryset):
        queryset.update(status=Report.Status.REVIEWING)
    @admin.action(description="Resolve selected reports")
    def resolve_reports(self, request, queryset):
        queryset.update(status=Report.Status.RESOLVED, resolved_by=request.user)
    @admin.action(description="Dismiss selected reports")
    def dismiss_reports(self, request, queryset):
        queryset.update(status=Report.Status.DISMISSED, resolved_by=request.user)

@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ("advertisement", "kind", "status", "starts_at", "ends_at", "created_by")
    list_filter = ("kind", "status")
    search_fields = ("advertisement__title",)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("seller", "rating", "reviewer", "advertisement", "is_hidden", "created_at")
    list_filter = ("is_hidden", "rating")
    search_fields = ("seller__email", "seller__phone_number", "reviewer__email", "reviewer__phone_number", "comment")
    raw_id_fields = ("conversation", "reviewer", "seller", "advertisement")
    actions = ("hide_reviews", "show_reviews")
    @admin.action(description="Hide selected reviews")
    def hide_reviews(self, request, queryset):
        queryset.update(is_hidden=True)
    @admin.action(description="Show selected reviews")
    def show_reviews(self, request, queryset):
        queryset.update(is_hidden=False)


@admin.register(BuyerRequest)
class BuyerRequestAdmin(admin.ModelAdmin):
    list_display = ("title", "requester", "category", "county", "status", "created_at", "expires_at")
    list_filter = ("status", "category", "county")
    search_fields = ("title", "description", "requester__email", "requester__phone_number")
    raw_id_fields = ("requester",)
    actions = ("hide_requests",)
    @admin.action(description="Hide selected requests (spam or not allowed)")
    def hide_requests(self, request, queryset):
        queryset.update(status=BuyerRequest.Status.HIDDEN)
