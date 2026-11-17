from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User

from .models import Advertisement, Category, County, SubCategory, Town


class LandmarkAndJobFieldTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.seller = User.objects.create_user(email="seller@example.com", password="StrongPass!2026", email_verified_at=timezone.now())
        self.client.force_authenticate(self.seller)
        self.county = County.objects.get(slug="montserrado")
        self.town = Town.objects.get(county=self.county, slug="monrovia")
        self.cars = Category.objects.get(name="Vehicles")
        self.jobs = Category.objects.get(slug="jobs")

    def tearDown(self):
        cache.clear()

    def payload(self, category, **extra):
        return {"title": "Item", "description": "Details here.", "price": "100.00", "currency": "USD", "condition": "used", "phone_number": "+231 770 123 456",
                "category_id": category.id, "subcategory_id": category.subcategories.first().id, "county_id": self.county.id, "town_id": self.town.id, **extra}

    def test_landmark_is_saved_and_searchable(self):
        response = self.client.post("/api/market/advertisements/", self.payload(self.cars, title="Toyota Corolla", landmark="  Behind Total station, Red Light "), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["landmark"], "Behind Total station, Red Light")
        Advertisement.objects.update(status=Advertisement.Status.ACTIVE)
        results = APIClient().get("/api/market/advertisements/", {"q": "red light"}).data["results"]
        self.assertEqual([ad["title"] for ad in results], ["Toyota Corolla"])

    def test_job_ads_need_a_job_type_and_keep_job_details(self):
        self.assertEqual(self.client.post("/api/market/advertisements/", self.payload(self.jobs, title="Driver needed"), format="json").status_code, 400)
        response = self.client.post("/api/market/advertisements/", self.payload(self.jobs, title="Driver needed", job_type="full_time", how_to_apply="Call or bring your CV to our office."), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual((response.data["job_type"], response.data["pay_period"], response.data["condition"]), ("full_time", "month", "new"))
        self.assertEqual(response.data["how_to_apply"], "Call or bring your CV to our office.")

    def test_job_fields_are_dropped_for_other_categories(self):
        response = self.client.post("/api/market/advertisements/", self.payload(self.cars, job_type="full_time", how_to_apply="x"), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual((response.data["job_type"], response.data["how_to_apply"]), ("", ""))
