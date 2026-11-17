from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.urls import include, path
from django.http import JsonResponse
from marketplace.share_views import listing_share, listing_share_image

urlpatterns = [path("health/", lambda request: JsonResponse({"status": "ok"}), name="health"), path("s/<slug:slug>/", listing_share, name="listing-share"), path("s/<slug:slug>/image.jpg", listing_share_image, name="listing-share-image"), path("admin/", admin.site.urls), path("api/auth/", include("accounts.urls")), path("api/market/", include("marketplace.urls")), path("api/admin/", include("marketplace.admin_urls"))]
if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
