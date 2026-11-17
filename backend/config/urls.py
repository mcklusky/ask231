from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.urls import include, path
from django.http import JsonResponse

urlpatterns = [path("health/", lambda request: JsonResponse({"status": "ok"}), name="health"), path("admin/", admin.site.urls), path("api/auth/", include("accounts.urls")), path("api/market/", include("marketplace.urls")), path("api/admin/", include("marketplace.admin_urls"))]
if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
