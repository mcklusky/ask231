"""Post newly approved ads to the site's Facebook page.

Turned off until these settings are filled in (see DEPLOYMENT.md):

- ``FACEBOOK_PAGE_ID``: the numeric ID of the Facebook page.
- ``FACEBOOK_PAGE_TOKEN``: a long-lived Page access token with permission to publish to that page.

Each ad is posted once, the first time staff approve it. The post links to the ad's
share address (``/s/<slug>/``), so Facebook shows the photo, title and price card.
Posting happens in the background after the approval is saved; a Facebook problem
is logged and never blocks moderation.
"""
import json
import logging
import threading
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings
from django.db import transaction

logger = logging.getLogger(__name__)

GRAPH_URL = "https://graph.facebook.com/v21.0"


def enabled():
    return bool(getattr(settings, "FACEBOOK_PAGE_ID", "") and getattr(settings, "FACEBOOK_PAGE_TOKEN", ""))


def _price(ad):
    prefix = {"LRD": "L$", "USD": "US$"}.get(ad.currency, f"{ad.currency} ")
    amount = f"{ad.price:,.2f}".rstrip("0").rstrip(".")
    return f"{prefix}{amount}"


def post_text(ad):
    place = ", ".join(part for part in [ad.town.name if ad.town_id else ad.city, ad.county.name if ad.county_id else ad.country] if part)
    lines = [f"🆕 {ad.title}", f"💰 {_price(ad)}{' per ' + ad.pay_period if ad.pay_period and ad.pay_period != 'job' else ''}", f"📍 {place}"]
    if ad.landmark:
        lines[-1] += f" ({ad.landmark})"
    lines.append(f"See the photos and message the seller on {settings.SITE_NAME} 👇")
    return "\n".join(lines)


def share_link(ad):
    base = (getattr(settings, "SHARE_BASE_URL", "") or settings.FRONTEND_URL).rstrip("/")
    return f"{base}/s/{ad.slug}/"


def _publish(ad_id):
    from .models import Advertisement

    ad = Advertisement.objects.select_related("town", "county").filter(pk=ad_id, status=Advertisement.Status.ACTIVE, facebook_post_id="").first()
    if not ad:
        return
    data = urllib.parse.urlencode({"message": post_text(ad), "link": share_link(ad), "access_token": settings.FACEBOOK_PAGE_TOKEN}).encode()
    request = urllib.request.Request(f"{GRAPH_URL}/{settings.FACEBOOK_PAGE_ID}/feed", data=data, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            post_id = json.loads(response.read().decode()).get("id", "")
    except urllib.error.HTTPError as error:
        logger.error("Facebook rejected the post for ad %s: %s", ad_id, error.read().decode(errors="replace")[:500])
        return
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        logger.error("Could not post ad %s to Facebook: %s", ad_id, error)
        return
    Advertisement.objects.filter(pk=ad_id).update(facebook_post_id=post_id or "posted")


def announce_approved(ads, run_now=False):
    """Queue Facebook posts for ads that just became active (no-op when Facebook isn't configured)."""
    if not enabled():
        return
    ids = [ad.pk for ad in ads if not ad.facebook_post_id]
    if not ids:
        return

    def start():
        if run_now:  # tests
            for ad_id in ids:
                _publish(ad_id)
            return
        threading.Thread(target=lambda: [_publish(ad_id) for ad_id in ids], daemon=True, name="facebook-posts").start()

    transaction.on_commit(start)
