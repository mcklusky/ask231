"""Daily currency exchange rates for the ad form's price converter.

Sellers abroad type their price in their own currency and the form converts it to US$ or the local
currency. Rates come from ExchangeRate-API's free feed (no key, updated daily, needs a credit link,
which the form shows). They are cached for 6 hours, and the last good copy is kept for a week so the
converter keeps working if the feed is briefly down.
"""
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings
from django.core.cache import cache
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

CACHE_KEY = "fx:usd"
FALLBACK_KEY = "fx:usd:last-good"
FRESH_SECONDS = 6 * 60 * 60
FALLBACK_SECONDS = 7 * 24 * 60 * 60
SOURCE = {"name": "ExchangeRate-API", "url": "https://www.exchangerate-api.com"}


class RatesUnavailable(Exception):
    pass


def _fetch():
    request = urllib.request.Request(settings.EXCHANGE_RATES_URL, headers={"accept": "application/json", "user-agent": f"{settings.SITE_NAME}-price-converter"})
    with urllib.request.urlopen(request, timeout=8) as response:
        data = json.load(response)
    rates = data.get("rates") if data.get("result") == "success" else None
    if not isinstance(rates, dict) or data.get("base_code") != "USD":
        raise ValueError("unexpected response")
    clean = {code: float(value) for code, value in rates.items() if isinstance(code, str) and len(code) == 3 and isinstance(value, (int, float)) and value > 0}
    if "USD" not in clean or settings.DEFAULT_CURRENCY not in clean:
        raise ValueError("missing currencies")
    return {"base": "USD", "rates": clean, "updated_at": data.get("time_last_update_utc", ""), "source": SOURCE}


def get_rates():
    """{base: "USD", rates: {code: units per US$1}, updated_at, source}. Raises RatesUnavailable."""
    rates = cache.get(CACHE_KEY)
    if rates:
        return rates
    try:
        rates = _fetch()
    except (urllib.error.URLError, TimeoutError, OSError, ValueError, TypeError) as error:
        logger.warning("Could not refresh exchange rates: %s", error)
        rates = cache.get(FALLBACK_KEY)
        if not rates:
            raise RatesUnavailable from None
        cache.set(CACHE_KEY, rates, 15 * 60)  # retry the feed in 15 minutes, not on every request
        return rates
    cache.set(CACHE_KEY, rates, FRESH_SECONDS)
    cache.set(FALLBACK_KEY, rates, FALLBACK_SECONDS)
    return rates


class ExchangeRatesView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            rates = get_rates()
        except RatesUnavailable:
            return Response({"detail": "Currency rates are not available right now. Enter your price in US$ or the local currency."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        response = Response(rates)
        response["Cache-Control"] = "public, max-age=3600"
        return response
