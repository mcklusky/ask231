"""One-time email verification links.

A link carries a random 256-bit token. Only its SHA-256 hash is stored, so a database leak gives
nobody working links. A link works once, for EMAIL_VERIFICATION_HOURS (24 by default), and
sending a new one cancels the older ones. Tokens are never logged.
"""
import hashlib
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone

from .models import EmailVerificationToken

logger = logging.getLogger(__name__)

RESEND_COOLDOWN = timedelta(seconds=60)
MAX_LINKS_PER_DAY = 5


def _hash(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def brand_name():
    return getattr(settings, "EMAIL_FROM_NAME", "") or settings.SITE_NAME


def can_send_link(user):
    """At most one link a minute and five a day per account (on top of the per-IP limits)."""
    now = timezone.now()
    recent = EmailVerificationToken.objects.filter(user=user, created_at__gte=now - timedelta(days=1))
    if recent.filter(created_at__gte=now - RESEND_COOLDOWN).exists():
        return False
    return recent.count() < MAX_LINKS_PER_DAY


def send_verification_email(user):
    """Create a fresh link (cancelling older ones) and email it. Returns True if the email went out."""
    token = secrets.token_urlsafe(32)
    now = timezone.now()
    hours = settings.EMAIL_VERIFICATION_HOURS
    with transaction.atomic():
        EmailVerificationToken.objects.filter(user=user, used_at__isnull=True).update(used_at=now)
        EmailVerificationToken.objects.create(user=user, email=user.email, token_hash=_hash(token), expires_at=now + timedelta(hours=hours))
    link = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"
    brand = brand_name()
    context = {
        "brand": brand,
        "name": user.first_name.strip() or "there",
        "link": link,
        "hours": hours,
        "site_url": settings.FRONTEND_URL.rstrip("/"),
        "logo_url": f"{settings.FRONTEND_URL.rstrip('/')}/icons/icon-192.png",
        "country": settings.COUNTRY_NAME,
    }
    message = EmailMultiAlternatives(
        subject=f"Verify your {brand} account",
        body=render_to_string("accounts/email/verify_email.txt", context),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    message.attach_alternative(render_to_string("accounts/email/verify_email.html", context), "text/html")
    try:
        message.send()
    except Exception:  # the account still exists; the member can ask for a new link
        logger.exception("Could not send the verification email for user %s", user.pk)
        return False
    return True


class VerificationResult:
    VERIFIED = "verified"
    INVALID = "invalid"
    EXPIRED = "expired"
    USED = "used"


def confirm_token(token):
    """Verify the email address behind ``token``. Returns (result, user or None)."""
    if not token or len(token) > 200:
        return VerificationResult.INVALID, None
    with transaction.atomic():
        entry = EmailVerificationToken.objects.select_for_update().select_related("user").filter(token_hash=_hash(token)).first()
        if entry is None or not entry.user.is_active:
            return VerificationResult.INVALID, None
        user = entry.user
        if entry.used_at:
            return VerificationResult.USED, user
        now = timezone.now()
        if entry.expires_at <= now:
            return VerificationResult.EXPIRED, user
        if (user.email or "").lower() != entry.email.lower():
            return VerificationResult.INVALID, None  # the account's address changed since the link was sent
        entry.used_at = now
        entry.save(update_fields=["used_at"])
        if not user.email_verified_at:
            user.email_verified_at = now
            user.save(update_fields=["email_verified_at"])
    return VerificationResult.VERIFIED, user
