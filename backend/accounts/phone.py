"""Phone numbers and one-time SMS codes (sign-up verification and password reset)."""
import hashlib
import hmac
import re
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import Throttled, ValidationError

from .sms import SmsError, send_sms

CODE_TTL = timedelta(minutes=10)
MAX_ATTEMPTS = 5
RESEND_AFTER = timedelta(seconds=60)
MAX_CODES_PER_HOUR = 5


def normalize_phone(value):
    """Return ``value`` as E.164 (``+231770123456``), or raise ValidationError.

    Accepts the formats people actually type: ``+231 770 123 456``, ``231770123456``,
    ``0770123456`` and ``770123456`` (the last two are taken as local numbers, using COUNTRY_CALLING_CODE).
    """
    cc = settings.COUNTRY_CALLING_CODE  # numbers without a country code are taken as local
    raw = (value or "").strip()
    digits = re.sub(r"\D", "", raw)
    if raw.startswith("+") or raw.startswith("00"):
        digits = digits[2:] if raw.startswith("00") else digits
    elif digits.startswith(cc) and len(digits) >= len(cc) + 8:
        pass
    else:
        digits = cc + digits.lstrip("0")
    if digits.startswith(cc):
        local = digits[len(cc):].lstrip("0")
        digits = cc + local
        if not 7 <= len(local) <= 9:
            raise ValidationError(f"Enter a valid {settings.COUNTRY_NAME} phone number, for example 0770 123 456.")
    if not 8 <= len(digits) <= 15:
        raise ValidationError("Enter a valid phone number with its country code.")
    return "+" + digits


def looks_like_phone(value):
    return "@" not in (value or "") and len(re.sub(r"\D", "", value or "")) >= 7


def mask_phone(phone):
    return f"{phone[:4]} •••• {phone[-3:]}" if phone and len(phone) > 7 else phone


def _hash(phone, purpose, code):
    return hmac.new(settings.SECRET_KEY.encode(), f"{phone}:{purpose}:{code}".encode(), hashlib.sha256).hexdigest()


def issue_code(phone, purpose, user=None):
    """Text a fresh 6-digit code to ``phone``. Raises Throttled when asked too often."""
    from .models import PhoneCode

    now = timezone.now()
    recent = PhoneCode.objects.filter(phone=phone, created_at__gte=now - timedelta(hours=1))
    latest = recent.order_by("-created_at").first()
    if latest and now - latest.created_at < RESEND_AFTER:
        wait = int((RESEND_AFTER - (now - latest.created_at)).total_seconds()) + 1
        raise Throttled(wait=wait, detail=f"Please wait {wait} seconds before asking for another code.")
    if recent.count() >= MAX_CODES_PER_HOUR:
        raise Throttled(detail="Too many codes were sent to this number. Please try again in an hour.")

    PhoneCode.objects.filter(phone=phone, purpose=purpose, used_at__isnull=True).update(used_at=now)
    code = f"{secrets.randbelow(1_000_000):06d}"
    PhoneCode.objects.create(user=user, phone=phone, purpose=purpose, code_hash=_hash(phone, purpose, code), expires_at=now + CODE_TTL)
    action = "reset your password" if purpose == PhoneCode.Purpose.RESET else "verify your phone"
    try:
        send_sms(phone, f"{code} is your {settings.SITE_NAME} code to {action}. It expires in 10 minutes. Never share this code with anyone.")
    except SmsError as error:
        raise ValidationError("We could not send a text to that number. Check it and try again.") from error


def check_code(phone, purpose, code):
    """True if ``code`` is the current code for ``phone``; each code works once and allows 5 tries."""
    from .models import PhoneCode

    code = re.sub(r"\D", "", str(code or ""))
    entry = PhoneCode.objects.filter(phone=phone, purpose=purpose, used_at__isnull=True, expires_at__gt=timezone.now()).order_by("-created_at").first()
    if not entry or entry.attempts >= MAX_ATTEMPTS or len(code) != 6:
        if entry:
            entry.attempts += 1
            entry.save(update_fields=["attempts"])
        return False
    entry.attempts += 1
    if hmac.compare_digest(entry.code_hash, _hash(phone, purpose, code)):
        entry.used_at = timezone.now()
        entry.save(update_fields=["attempts", "used_at"])
        return True
    entry.save(update_fields=["attempts"])
    return False
