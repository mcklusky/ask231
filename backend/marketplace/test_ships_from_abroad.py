from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User

from . import facebook
from .models import Advertisement, Category, County, Town


class ShipsFromAbroadTests(TestCase):
    """A seller who is outside the site's country (e.g. in Ghana) can list items that ship to buyers here."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.seller = User.objects.create_user(email="seller@example.com", password="StrongPass!2026", email_verified_at=timezone.now())
        self.client.force_authenticate(self.seller)
        self.county = County.objects.get(slug="montserrado")
        self.town = Town.objects.get(county=self.county, slug="monrovia")
        self.phones = Category.objects.get(name="Phones & Tablets")

    def tearDown(self):
        cache.clear()

    def payload(self, **extra):
        return {"title": "iPhone 13", "description": "Like new.", "price": "450.00", "currency": "USD", "condition": "used", "phone_number": "+233 24 123 4567",
                "category_id": self.phones.id, "subcategory_id": self.phones.subcategories.first().id, **extra}

    def post(self, **extra):
        return self.client.post("/api/market/advertisements/", self.payload(**extra), format="json")

    def test_seller_abroad_lists_with_city_and_shipping_details(self):
        response = self.post(country="Ghana", city="Accra", shipping_details="  DHL to Monrovia in 5-7 days, US$20  ")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["country"], "Ghana")
        self.assertTrue(response.data["ships_from_abroad"])
        self.assertEqual(response.data["shipping_details"], "DHL to Monrovia in 5-7 days, US$20")
        self.assertIsNone(response.data["county"])

    def test_seller_abroad_needs_a_city_but_no_county(self):
        self.assertEqual(self.post(country="Ghana").status_code, 400)
        self.assertEqual(self.post(country="Ghana", city="Accra").status_code, 201)

    def test_home_country_needs_county_and_drops_shipping_details(self):
        self.assertEqual(self.post(country="Liberia").status_code, 400)
        response = self.post(country=" liberia ", county_id=self.county.id, town_id=self.town.id, shipping_details="should be ignored")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual((response.data["country"], response.data["ships_from_abroad"], response.data["shipping_details"]), ("Liberia", False, ""))

    def test_country_defaults_to_the_site_country(self):
        response = self.post(county_id=self.county.id, town_id=self.town.id)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["country"], "Liberia")

    @override_settings(COUNTRY_NAME="Ghana")
    def test_home_country_follows_settings_not_a_hard_coded_name(self):
        response = self.post(country="Liberia", city="Monrovia")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data["ships_from_abroad"])

    def test_buyers_can_filter_by_country(self):
        self.post(country="Ghana", city="Accra")
        self.post(country="Liberia", county_id=self.county.id, town_id=self.town.id, title="Samsung A15")
        Advertisement.objects.update(status=Advertisement.Status.ACTIVE)
        results = APIClient().get("/api/market/advertisements/", {"country": "ghana"}).data["results"]
        self.assertEqual([ad["title"] for ad in results], ["iPhone 13"])

    def test_facebook_post_and_link_preview_say_where_it_ships_from(self):
        self.post(country="Ghana", city="Accra")
        ad = Advertisement.objects.get()
        self.assertIn("📦 Ships from Ghana to Liberia", facebook.post_text(ad))
        Advertisement.objects.update(status=Advertisement.Status.ACTIVE)
        page = APIClient().get(f"/s/{ad.slug}/")
        self.assertContains(page, "Ships from Ghana to Liberia")
