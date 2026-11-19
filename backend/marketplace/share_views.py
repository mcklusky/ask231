"""Link previews for WhatsApp, Facebook, X and other apps that read Open Graph tags.

The React app renders in the browser, but link-preview crawlers do not run JavaScript, so a shared
/ads/<slug> address would only show the generic site title. The Share button therefore shares
/s/<slug>/, served here: a tiny HTML page with the ad's title, price, photo and description as
Open Graph tags that immediately forwards real visitors to the ad page in the web app.
"""
from io import BytesIO

from django.conf import settings
from django.http import Http404, HttpResponse
from django.shortcuts import render
from django.urls import reverse
from django.utils.text import Truncator
from PIL import Image

from .models import Advertisement, is_abroad

SHARE_IMAGE_MAX = 1200  # longest side of the JPEG served to link-preview crawlers


def _money(ad):
    """Same style as the web app: "L$ 28,500", "US$ 420.50" (both dollars circulate, so never a bare "$")."""
    number = f"{ad.price:,.0f}" if ad.price % 1 == 0 else f"{ad.price:,.2f}"
    prefix = {"LRD": "L$", "USD": "US$"}.get(ad.currency, ad.currency)
    return f"{prefix} {number}"


def _location(ad):
    if not is_abroad(ad.country):
        parts = [ad.town.name if ad.town else "", ad.county.name if ad.county else ""]
    else:
        parts = [ad.city or (ad.town.name if ad.town else ""), ad.region or (ad.county.name if ad.county else ""), ad.country]
    return ", ".join(part for part in parts if part)


def listing_share(request, slug):
    frontend = settings.FRONTEND_URL.rstrip("/")
    share_url = request.build_absolute_uri()
    # Branded 1200x630 card (frontend/public/og-default.png) for ads without photos.
    default_image = {"url": f"{frontend}/og-default.png", "width": 1200, "height": 630, "alt": f"{settings.SITE_NAME}: buy, sell and ask for anything in {settings.COUNTRY_NAME}"}
    ad = (Advertisement.objects.filter(slug=slug, status=Advertisement.Status.ACTIVE)
          .select_related("county", "town", "category").prefetch_related("images").first())
    if ad is None:
        # Unknown, pending, sold or removed ads: generic preview, no details leaked.
        return render(request, "marketplace/share.html", {
            "title": f"{settings.SITE_NAME}: Buy & Sell", "description": f"This listing is no longer available. Find similar items across {settings.COUNTRY_NAME}.",
            "target": f"{frontend}/listings", "share_url": share_url, "site_name": settings.SITE_NAME, "image": default_image,
        }, status=404)

    photo = ad.images.first()
    image = default_image
    if photo:
        # JPEG copy: not every app (notably older WhatsApp versions) shows WebP in link previews.
        width, height = photo.width, photo.height
        if width and height and max(width, height) > SHARE_IMAGE_MAX:  # dimensions of the JPEG actually served
            scale = SHARE_IMAGE_MAX / max(width, height)
            width, height = round(width * scale), round(height * scale)
        image = {"url": request.build_absolute_uri(reverse("listing-share-image", args=[ad.slug])), "type": "image/jpeg",
                 "width": width, "height": height, "alt": photo.alt_text or ad.title}
    condition = "New" if ad.condition == Advertisement.Condition.NEW else "Used"
    location = f"Ships from {ad.country} to {settings.COUNTRY_NAME}" if is_abroad(ad.country) else _location(ad)
    summary = " · ".join(part for part in [condition, location, ad.category.name] if part)
    return render(request, "marketplace/share.html", {
        "title": f"{_money(ad)} · {ad.title}",
        "description": f"{summary} — {Truncator(' '.join(ad.description.split())).chars(150)}",
        "target": f"{frontend}/ads/{ad.slug}",
        "share_url": share_url, "site_name": settings.SITE_NAME,
        "image": image,
    })


def listing_share_image(request, slug):
    """First photo of an active ad as a JPEG for link-preview crawlers; cached for a day."""
    ad = Advertisement.objects.filter(slug=slug, status=Advertisement.Status.ACTIVE).first()
    photo = ad.images.first() if ad else None
    if photo is None:
        raise Http404("No preview image.")
    with photo.image.open("rb") as source, Image.open(source) as image:
        image = image.convert("RGB")
        image.thumbnail((SHARE_IMAGE_MAX, SHARE_IMAGE_MAX))
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=82, optimize=True, progressive=True)
    response = HttpResponse(buffer.getvalue(), content_type="image/jpeg")
    response["Cache-Control"] = "public, max-age=86400"
    return response
