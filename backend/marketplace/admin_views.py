from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import decorators, filters, permissions, response, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import JSONParser
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from accounts.models import SellerProfile
from .admin_serializers import AdminAdvertisementSerializer, AdminCategorySerializer, AdminCountySerializer, AdminPromotionSerializer, AdminReportSerializer, AdminSellerSerializer, AdminSubCategorySerializer, AdminTownSerializer, AdminUserSerializer, ReportCreateSerializer
from .models import Advertisement, Category, County, Promotion, Report, SubCategory, Town
from . import facebook

User = get_user_model()

class StaffOnly(permissions.IsAdminUser):
    pass

class AdminStatsView(APIView):
    permission_classes = [StaffOnly]
    def get(self, request):
        now = timezone.now()
        recent_ads = Advertisement.objects.select_related("seller").order_by("-created_at").values(
            "id", "title", "slug", "status", "created_at", "seller__email"
        )[:5]
        recent_reports = Report.objects.select_related("advertisement", "reported_user").exclude(
            status__in=[Report.Status.RESOLVED, Report.Status.DISMISSED]
        ).order_by("-created_at").values(
            "id", "reason", "status", "created_at", "advertisement__title", "reported_user__email"
        )[:5]
        data = {
            "users": User.objects.filter(is_staff=False, is_superuser=False).count(),
            "sellers": SellerProfile.objects.count(),
            "suspended_users": User.objects.filter(is_active=False, is_staff=False).count(),
            "pending_ads": Advertisement.objects.filter(status=Advertisement.Status.PENDING).count(),
            "active_ads": Advertisement.objects.filter(status=Advertisement.Status.ACTIVE).count(),
            "sold_ads": Advertisement.objects.filter(status=Advertisement.Status.SOLD).count(),
            "rejected_ads": Advertisement.objects.filter(status=Advertisement.Status.REJECTED).count(),
            "expired_ads": Advertisement.objects.filter(status=Advertisement.Status.EXPIRED).count(),
            "suspended_ads": Advertisement.objects.filter(status=Advertisement.Status.SUSPENDED).count(),
            "open_reports": Report.objects.filter(status__in=[Report.Status.OPEN, Report.Status.REVIEWING]).count(),
            "active_promotions": Promotion.objects.filter(status=Promotion.Status.ACTIVE, starts_at__lte=now, ends_at__gt=now).count(),
            "recent_ads": list(recent_ads),
            "recent_reports": list(recent_reports),
        }
        return response.Response(data)

class AdminUserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [StaffOnly]
    serializer_class = AdminUserSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["email", "phone_number", "first_name", "last_name"]
    ordering_fields = ["date_joined", "email"]
    def get_queryset(self):
        queryset = User.objects.filter(is_staff=False, is_superuser=False).select_related("profile").annotate(seller_flag=Count("seller_profile"))
        state = self.request.query_params.get("state")
        if state == "suspended":
            queryset = queryset.filter(is_active=False)
        elif state == "active":
            queryset = queryset.filter(is_active=True)
        return queryset
    @decorators.action(detail=True, methods=["post"])
    def status(self, request, pk=None):
        user = self.get_object()
        active = request.data.get("is_active")
        if not isinstance(active, bool):
            raise ValidationError({"is_active": "Provide true to reactivate or false to suspend the account."})
        if user.pk == request.user.pk:
            raise ValidationError("You cannot suspend your own admin session.")
        user.is_active = active
        user.save(update_fields=["is_active"])
        return response.Response(self.get_serializer(user).data)

class AdminSellerViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [StaffOnly]
    serializer_class = AdminSellerSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["business_name", "user__email", "user__first_name", "user__last_name"]
    def get_queryset(self):
        queryset = SellerProfile.objects.select_related("user", "user__profile").annotate(listings_total=Count("user__advertisements"))
        verified = self.request.query_params.get("verified")
        if verified in ("true", "false"):
            queryset = queryset.filter(is_verified=(verified == "true"))
        return queryset
    @decorators.action(detail=True, methods=["post"])
    def verification(self, request, pk=None):
        seller = self.get_object()
        value = request.data.get("is_verified")
        if not isinstance(value, bool):
            raise ValidationError({"is_verified": "Provide a boolean verification value."})
        seller.is_verified = value
        seller.verification_requested_at = seller.verification_requested_at or timezone.now()
        seller.save(update_fields=["is_verified", "verification_requested_at", "updated_at"])
        return response.Response(self.get_serializer(seller).data)

class AdminAdvertisementViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [StaffOnly]
    serializer_class = AdminAdvertisementSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "seller__email", "seller__first_name"]
    ordering_fields = ["created_at", "price", "views_count"]
    def get_queryset(self):
        queryset = Advertisement.objects.select_related("seller", "category", "county", "town").prefetch_related("images")
        state = self.request.query_params.get("status")
        if state in Advertisement.Status.values:
            queryset = queryset.filter(status=state)
        return queryset
    @decorators.action(detail=True, methods=["post"])
    def moderation(self, request, pk=None):
        ad = self.get_object()
        new_status = request.data.get("status")
        allowed = {Advertisement.Status.ACTIVE, Advertisement.Status.REJECTED, Advertisement.Status.SUSPENDED, Advertisement.Status.EXPIRED}
        if new_status not in allowed:
            raise ValidationError({"status": "Choose active, rejected, suspended, or expired."})
        reason = str(request.data.get("rejection_reason", ""))[:240]
        if new_status in (Advertisement.Status.REJECTED, Advertisement.Status.SUSPENDED) and not reason.strip():
            raise ValidationError({"rejection_reason": "Add a short reason for this moderation action."})
        was_active = ad.status == Advertisement.Status.ACTIVE
        ad.status = new_status
        ad.rejection_reason = reason if new_status in (Advertisement.Status.REJECTED, Advertisement.Status.SUSPENDED) else ""
        ad.save(update_fields=["status", "rejection_reason", "updated_at"])
        if new_status == Advertisement.Status.ACTIVE and not was_active:
            facebook.announce_approved([ad])
        return response.Response(self.get_serializer(ad).data)

class AdminCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [StaffOnly]
    serializer_class = AdminCategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    queryset = Category.objects.all()
    search_fields = ["name", "description"]
    def get_queryset(self):
        queryset = self.queryset
        active = self.request.query_params.get("is_active")
        if active in ("true", "false"):
            queryset = queryset.filter(is_active=(active == "true"))
        return queryset
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

class AdminSubCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [StaffOnly]
    serializer_class = AdminSubCategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    queryset = SubCategory.objects.select_related("category")
    search_fields = ["name", "category__name"]
    def get_queryset(self):
        queryset = self.queryset
        category_id = self.request.query_params.get("category")
        active = self.request.query_params.get("is_active")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        if active in ("true", "false"):
            queryset = queryset.filter(is_active=(active == "true"))
        return queryset
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

class AdminCountyViewSet(viewsets.ModelViewSet):
    permission_classes = [StaffOnly]
    serializer_class = AdminCountySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    queryset = County.objects.all()
    search_fields = ["name"]
    def get_queryset(self):
        queryset = self.queryset
        active = self.request.query_params.get("is_active")
        if active in ("true", "false"):
            queryset = queryset.filter(is_active=(active == "true"))
        return queryset
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

class AdminTownViewSet(viewsets.ModelViewSet):
    permission_classes = [StaffOnly]
    serializer_class = AdminTownSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    queryset = Town.objects.select_related("county")
    search_fields = ["name", "county__name"]
    def get_queryset(self):
        queryset = self.queryset
        county_id = self.request.query_params.get("county")
        active = self.request.query_params.get("is_active")
        if county_id:
            queryset = queryset.filter(county_id=county_id)
        if active in ("true", "false"):
            queryset = queryset.filter(is_active=(active == "true"))
        return queryset
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

class AdminReportViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [StaffOnly]
    serializer_class = AdminReportSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["reporter__email", "advertisement__title", "reported_user__email", "details"]
    queryset = Report.objects.select_related("reporter", "advertisement", "reported_user", "resolved_by")
    def get_queryset(self):
        queryset = self.queryset
        state = self.request.query_params.get("status")
        if state in Report.Status.values:
            queryset = queryset.filter(status=state)
        return queryset
    @decorators.action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        report = self.get_object()
        new_status = request.data.get("status")
        if new_status not in (Report.Status.REVIEWING, Report.Status.RESOLVED, Report.Status.DISMISSED):
            raise ValidationError({"status": "Choose reviewing, resolved, or dismissed."})
        report.status = new_status
        report.resolution_note = str(request.data.get("resolution_note", ""))[:500]
        report.resolved_by = request.user if new_status in (Report.Status.RESOLVED, Report.Status.DISMISSED) else None
        report.save(update_fields=["status", "resolution_note", "resolved_by", "updated_at"])
        return response.Response(self.get_serializer(report).data)

class AdminPromotionViewSet(viewsets.ModelViewSet):
    permission_classes = [StaffOnly]
    serializer_class = AdminPromotionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["advertisement__title", "advertisement__seller__email"]
    queryset = Promotion.objects.select_related("advertisement", "created_by")
    def get_queryset(self):
        queryset = self.queryset
        state = self.request.query_params.get("status")
        kind = self.request.query_params.get("kind")
        if state in Promotion.Status.values:
            queryset = queryset.filter(status=state)
        if kind in Promotion.Kind.values:
            queryset = queryset.filter(kind=kind)
        return queryset
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class ReportThrottle(UserRateThrottle):
    scope = "reports"

class ReportCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser]
    throttle_classes = [ReportThrottle]
    def post(self, request):
        serializer = ReportCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response({"detail": "Report submitted for review."}, status=status.HTTP_201_CREATED)
