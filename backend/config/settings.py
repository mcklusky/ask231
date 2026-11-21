import os
import sys
from datetime import timedelta
from pathlib import Path
import dj_database_url
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-change-me-before-deployment")
# Debug is off unless explicitly enabled (local .env sets DJANGO_DEBUG=True).
DEBUG = os.getenv("DJANGO_DEBUG", "False").lower() in {"true", "1", "yes", "on", "debug"}
ALLOWED_HOSTS = [x.strip() for x in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if x.strip()]
if not DEBUG and (SECRET_KEY == "dev-only-change-me-before-deployment" or not ALLOWED_HOSTS):
    raise ImproperlyConfigured("Set DJANGO_SECRET_KEY and ALLOWED_HOSTS for production.")
INSTALLED_APPS = ["django.contrib.admin", "django.contrib.auth", "django.contrib.contenttypes", "django.contrib.sessions", "django.contrib.messages", "django.contrib.staticfiles", "rest_framework", "corsheaders", "rest_framework_simplejwt.token_blacklist", "accounts", "marketplace"]
MIDDLEWARE = ["django.middleware.security.SecurityMiddleware", "whitenoise.middleware.WhiteNoiseMiddleware", "corsheaders.middleware.CorsMiddleware", "django.contrib.sessions.middleware.SessionMiddleware", "django.middleware.common.CommonMiddleware", "django.middleware.csrf.CsrfViewMiddleware", "django.contrib.auth.middleware.AuthenticationMiddleware", "django.contrib.messages.middleware.MessageMiddleware", "django.middleware.clickjacking.XFrameOptionsMiddleware"]
ROOT_URLCONF = "config.urls"
TEMPLATES = [{"BACKEND": "django.template.backends.django.DjangoTemplates", "DIRS": [], "APP_DIRS": True, "OPTIONS": {"context_processors": ["django.template.context_processors.request", "django.contrib.auth.context_processors.auth", "django.contrib.messages.context_processors.messages"]}}]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
url = os.getenv("DATABASE_URL", "").strip()
if url:
    DATABASES = {"default": dj_database_url.parse(url, conn_max_age=600)}
elif os.getenv("DB_HOST"):
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "marketday"),
        "USER": os.getenv("DB_USER", "marketday"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.environ["DB_HOST"],
        "PORT": os.getenv("DB_PORT", "5432"),
        "CONN_MAX_AGE": 600,
        "OPTIONS": {"sslmode": os.getenv("DB_SSLMODE", "require")},
    }}
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}
AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [{"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"}, {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"}, {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"}, {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"}]
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Monrovia"
USE_I18N = True
USE_TZ = True
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME", "").strip()
AWS_S3_REGION_NAME = os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
AWS_S3_CUSTOM_DOMAIN = os.getenv("AWS_MEDIA_CLOUDFRONT_DOMAIN", "").strip()
if AWS_STORAGE_BUCKET_NAME:
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": AWS_STORAGE_BUCKET_NAME,
            "region_name": AWS_S3_REGION_NAME,
            "location": "media",
            "custom_domain": AWS_S3_CUSTOM_DOMAIN or None,
            "querystring_auth": False,
            "file_overwrite": False,
            "default_acl": None,
            "object_parameters": {"CacheControl": "max-age=86400"},
        },
    }
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
# Email. Production sends through Brevo: set BREVO_API_KEY and EMAIL_BACKEND=accounts.brevo.BrevoEmailBackend.
# Without an EMAIL_BACKEND, Brevo is used whenever BREVO_API_KEY is set, otherwise emails print to the console.
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
BREVO_API_URL = os.getenv("BREVO_API_URL", "https://api.brevo.com/v3")
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "accounts.brevo.BrevoEmailBackend" if BREVO_API_KEY else "django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "accounts@liberiabuysell.local")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "")  # sender name shown in inboxes; defaults to SITE_NAME
EMAIL_VERIFICATION_HOURS = int(os.getenv("EMAIL_VERIFICATION_HOURS", "24"))  # how long a verification link works
if EMAIL_BACKEND == "django.core.mail.backends.smtp.EmailBackend":
    EMAIL_HOST = os.getenv("EMAIL_HOST", "email-smtp.us-east-1.amazonaws.com")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in {"true", "1", "yes", "on"}
    EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
# ---------------------------------------------------------------------------
# Country and brand. The site name is the brand word plus the country calling code
# (ask + 231 = ask231, always lowercase). To launch in another country, change these values
# (e.g. COUNTRY_CALLING_CODE=233, COUNTRY_NAME=Ghana, DEFAULT_CURRENCY=GHS) and load that country's regions.
COUNTRY_CALLING_CODE = os.getenv("COUNTRY_CALLING_CODE", "231")
COUNTRY_NAME = os.getenv("COUNTRY_NAME", "Liberia")
DEFAULT_CURRENCY = os.getenv("DEFAULT_CURRENCY", "LRD")
BRAND_WORD = os.getenv("BRAND_WORD", "ask")
SITE_NAME = os.getenv("SITE_NAME", f"{BRAND_WORD}{COUNTRY_CALLING_CODE}")
# Daily exchange rates (US$ base) for the ad form's price converter. See marketplace/exchange_rates.py.
EXCHANGE_RATES_URL = os.getenv("EXCHANGE_RATES_URL", "https://open.er-api.com/v6/latest/USD")
# ---------------------------------------------------------------------------

# Text messages: "console" prints them (development); "aws" or "twilio" sends them. See accounts/sms.py.
SMS_BACKEND = os.getenv("SMS_BACKEND", "console")
if len(sys.argv) > 1 and sys.argv[1] == "test":
    SMS_BACKEND = "locmem"  # tests read texts from accounts.sms.outbox
SMS_FROM = os.getenv("SMS_FROM", "")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
SMS_AWS_REGION = os.getenv("SMS_AWS_REGION", os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "us-east-1")))
# Post newly approved ads to the brand's Facebook page (off until both are set). See marketplace/facebook.py.
FACEBOOK_PAGE_ID = os.getenv("FACEBOOK_PAGE_ID", "")
FACEBOOK_PAGE_TOKEN = os.getenv("FACEBOOK_PAGE_TOKEN", "")
# Public site address used in shared links (defaults to FRONTEND_URL; same site in production).
SHARE_BASE_URL = os.getenv("SHARE_BASE_URL", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
CORS_ALLOWED_ORIGINS = [x.strip() for x in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if x.strip()]
CSRF_TRUSTED_ORIGINS = [x.strip() for x in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",") if x.strip()]
# Number of proxies (e.g. Caddy/nginx/load balancer) in front of Django, so rate limits use the visitor's real IP.
_num_proxies = os.getenv("NUM_PROXIES", "").strip()
REST_FRAMEWORK = {"DEFAULT_AUTHENTICATION_CLASSES": ["accounts.auth.VerifiedJWTAuthentication"], "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticatedOrReadOnly"], "DEFAULT_PAGINATION_CLASS": "config.pagination.MarketplacePagination", "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.AnonRateThrottle", "rest_framework.throttling.UserRateThrottle"], "DEFAULT_THROTTLE_RATES": {"anon": "120/hour", "user": "1200/hour", "auth": "10/hour", "verification": "5/hour", "verification_resend": "5/hour", "reports": "20/hour"}}
if _num_proxies:
    REST_FRAMEWORK["NUM_PROXIES"] = int(_num_proxies)
SIMPLE_JWT = {"ACCESS_TOKEN_LIFETIME": timedelta(minutes=15), "REFRESH_TOKEN_LIFETIME": timedelta(days=7), "ROTATE_REFRESH_TOKENS": True, "BLACKLIST_AFTER_ROTATION": True, "AUTH_HEADER_TYPES": ("Bearer",)}
if not DEBUG:
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "True").lower() in {"true", "1", "yes", "on"}
    CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", "True").lower() in {"true", "1", "yes", "on"}
    SECURE_REFERRER_POLICY = "same-origin"
    SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "True").lower() in {"true", "1", "yes", "on"}
    SECURE_REDIRECT_EXEMPT = [r"^health/$"]  # container health checks call Django directly over plain HTTP
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv("SECURE_HSTS_INCLUDE_SUBDOMAINS", "True").lower() in {"true", "1", "yes", "on"}
    SECURE_HSTS_PRELOAD = os.getenv("SECURE_HSTS_PRELOAD", "False").lower() in {"true", "1", "yes", "on"}
    USE_X_FORWARDED_HOST = os.getenv("USE_X_FORWARDED_HOST", "False").lower() in {"true", "1", "yes", "on"}
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https") if os.getenv("TRUST_X_FORWARDED_PROTO", "False").lower() in {"true", "1", "yes", "on"} else None
