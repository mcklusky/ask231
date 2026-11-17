from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .admin_views import AdminAdvertisementViewSet, AdminCategoryViewSet, AdminCountyViewSet, AdminPromotionViewSet, AdminReportViewSet, AdminSellerViewSet, AdminStatsView, AdminSubCategoryViewSet, AdminTownViewSet, AdminUserViewSet

router = DefaultRouter()
router.register("users", AdminUserViewSet, basename="admin-users")
router.register("sellers", AdminSellerViewSet, basename="admin-sellers")
router.register("advertisements", AdminAdvertisementViewSet, basename="admin-advertisements")
router.register("categories", AdminCategoryViewSet, basename="admin-categories")
router.register("subcategories", AdminSubCategoryViewSet, basename="admin-subcategories")
router.register("counties", AdminCountyViewSet, basename="admin-counties")
router.register("towns", AdminTownViewSet, basename="admin-towns")
router.register("reports", AdminReportViewSet, basename="admin-reports")
router.register("promotions", AdminPromotionViewSet, basename="admin-promotions")

urlpatterns = [path("stats/", AdminStatsView.as_view(), name="admin-stats"), path("", include(router.urls))]
