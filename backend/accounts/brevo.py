"""Send Django email through the Brevo transactional email API (POST /v3/smtp/email).

Turn it on with EMAIL_BACKEND=accounts.brevo.BrevoEmailBackend and BREVO_API_KEY in backend/.env.
Every email the site sends (verification links, password resets, message alerts) then goes
through Brevo. The API key is only ever sent in the request header; it is never logged.
"""
import json
import logging
import urllib.error
import urllib.request
from email.utils import parseaddr

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend
from django.utils.html import escape, linebreaks, urlize

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 15


class BrevoError(Exception):
    pass


def _address(value):
    name, email = parseaddr(value)
    item = {"email": email}
    if name:
        item["name"] = name
    return item


def _mask(email):
    local, _, domain = email.partition("@")
    return f"{local[:2]}***@{domain}" if domain else "***"


class BrevoEmailBackend(BaseEmailBackend):
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = getattr(settings, "BREVO_API_KEY", "")
        self.api_url = getattr(settings, "BREVO_API_URL", "https://api.brevo.com/v3").rstrip("/")
        if not self.api_key and not fail_silently:
            raise ImproperlyConfigured("BREVO_API_KEY is not set; add it to backend/.env to send email through Brevo.")

    def send_messages(self, email_messages):
        sent = 0
        for message in email_messages:
            try:
                self._send(message)
                sent += 1
            except Exception:
                if not self.fail_silently:
                    raise
        return sent

    def payload(self, message):
        sender = _address(message.from_email or settings.DEFAULT_FROM_EMAIL)
        sender.setdefault("name", getattr(settings, "EMAIL_FROM_NAME", "") or settings.SITE_NAME)
        html = next((content for content, mimetype in getattr(message, "alternatives", []) if mimetype == "text/html"), None)
        if message.content_subtype == "html":
            html, text = message.body, None
        else:
            text = message.body
        data = {
            "sender": sender,
            "to": [_address(address) for address in message.to],
            "subject": message.subject,
            # Brevo needs an HTML part; plain-text-only emails get a simple HTML copy.
            "htmlContent": html or linebreaks(urlize(escape(text or ""))),
        }
        if text:
            data["textContent"] = text
        if message.cc:
            data["cc"] = [_address(address) for address in message.cc]
        if message.bcc:
            data["bcc"] = [_address(address) for address in message.bcc]
        if message.reply_to:
            data["replyTo"] = _address(message.reply_to[0])
        return data

    def _send(self, message):
        if not message.recipients():
            return
        request = urllib.request.Request(
            f"{self.api_url}/smtp/email",
            data=json.dumps(self.payload(message)).encode("utf-8"),
            headers={"api-key": self.api_key, "accept": "application/json", "content-type": "application/json"},
            method="POST",
        )
        recipients = ", ".join(_mask(address) for address in message.to)
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                response.read()
        except urllib.error.HTTPError as error:
            try:
                detail = json.loads(error.read().decode("utf-8", "replace")).get("message", "")
            except (ValueError, AttributeError):
                detail = ""
            logger.error("Brevo refused email to %s: HTTP %s %s", recipients, error.code, detail)
            raise BrevoError(f"Brevo refused the email (HTTP {error.code}). {detail}".strip()) from None
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            logger.error("Could not reach Brevo to email %s: %s", recipients, getattr(error, "reason", error))
            raise BrevoError("Could not reach Brevo.") from None
