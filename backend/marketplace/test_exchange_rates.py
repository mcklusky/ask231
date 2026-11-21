import io
import json
import urllib.error
from unittest import mock

from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from . import exchange_rates

FEED = {"result": "success", "base_code": "USD", "time_last_update_utc": "Fri, 20 Nov 2026 00:02:32 +0000", "rates": {"USD": 1, "LRD": 168.3, "GHS": 11.78, "EUR": 0.91, "BAD": "x", "TOOLONG": 2}}


def feed(data=FEED):
    response = mock.MagicMock()
    response.__enter__.return_value = io.BytesIO(json.dumps(data).encode())
    return response


class ExchangeRatesTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    def get(self):
        return self.client.get("/api/market/exchange-rates/")

    def test_returns_usd_based_rates_and_credits_the_source(self):
        with mock.patch("urllib.request.urlopen", return_value=feed()):
            response = self.get()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["base"], "USD")
        self.assertEqual(response.data["rates"], {"USD": 1.0, "LRD": 168.3, "GHS": 11.78, "EUR": 0.91})  # junk entries dropped
        self.assertEqual(response.data["source"]["name"], "ExchangeRate-API")
        self.assertIn("max-age", response["Cache-Control"])

    def test_rates_are_cached(self):
        with mock.patch("urllib.request.urlopen", return_value=feed()) as urlopen:
            self.get(); self.get(); self.get()
        self.assertEqual(urlopen.call_count, 1)

    def test_uses_the_last_good_rates_when_the_feed_is_down(self):
        with mock.patch("urllib.request.urlopen", return_value=feed()):
            self.get()
        cache.delete(exchange_rates.CACHE_KEY)  # the 6-hour copy expired
        with mock.patch("urllib.request.urlopen", side_effect=urllib.error.URLError("down")), self.assertLogs("marketplace.exchange_rates", "WARNING"):
            response = self.get()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["rates"]["LRD"], 168.3)

    def test_503_when_no_rates_have_ever_loaded(self):
        with mock.patch("urllib.request.urlopen", side_effect=urllib.error.URLError("down")), self.assertLogs("marketplace.exchange_rates", "WARNING"):
            response = self.get()
        self.assertEqual(response.status_code, 503)

    def test_rejects_a_feed_without_the_local_currency(self):
        bad = {**FEED, "rates": {"USD": 1, "EUR": 0.9}}
        with mock.patch("urllib.request.urlopen", return_value=feed(bad)), self.assertLogs("marketplace.exchange_rates", "WARNING"):
            self.assertEqual(self.get().status_code, 503)
