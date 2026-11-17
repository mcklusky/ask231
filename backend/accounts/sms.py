"""Sending text messages (SMS).

Pick the provider with the ``SMS_BACKEND`` setting:

- ``console`` (default): prints the text in the server log. For local development.
- ``locmem``: keeps texts in ``sms.outbox`` (used by the tests, like Django's mail outbox).
- ``twilio``: sends through Twilio's REST API. Needs ``TWILIO_ACCOUNT_SID``,
  ``TWILIO_AUTH_TOKEN`` and ``SMS_FROM`` (a Twilio number or approved sender ID).

Another provider can be added as one more branch in ``send_sms``.
"""
import base64
import json
import logging
import urllib.parse
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

outbox = []  # locmem backend


class SmsError(Exception):
    pass


def send_sms(to, body):
    """Send ``body`` to the E.164 number ``to`` (for example ``+231770123456``)."""
    backend = getattr(settings, "SMS_BACKEND", "console")
    if backend == "locmem":
        outbox.append({"to": to, "body": body})
    elif backend == "console":
        logger.warning("SMS to %s: %s", to, body)
        print(f"--- SMS to {to} ---\n{body}\n---", flush=True)
    elif backend == "twilio":
        _send_twilio(to, body)
    else:
        raise SmsError(f"Unknown SMS_BACKEND {backend!r}")


def _send_twilio(to, body):
    sid, token, sender = settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.SMS_FROM
    if not (sid and token and sender):
        raise SmsError("Twilio is not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, SMS_FROM).")
    request = urllib.request.Request(
        f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
        data=urllib.parse.urlencode({"To": to, "From": sender, "Body": body}).encode(),
        headers={"Authorization": "Basic " + base64.b64encode(f"{sid}:{token}".encode()).decode()},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if response.status >= 300:
                raise SmsError(f"Twilio returned {response.status}")
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")[:300]
        try:
            detail = json.loads(detail).get("message", detail)
        except ValueError:
            pass
        raise SmsError(f"Twilio error {error.code}: {detail}") from error
    except urllib.error.URLError as error:
        raise SmsError(f"Could not reach Twilio: {error.reason}") from error
