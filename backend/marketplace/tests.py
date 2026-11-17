from io import BytesIO
import tempfile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from django.test import TestCase
from rest_framework.test import APIClient
from .models import Advertisement, Category, County, SubCategory, Town
from .models import Promotion, Report
from accounts.models import User
from django.core.cache import cache
from django.utils import timezone as dj_timezone
from .models import Conversation, Message


class AdvertisementApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(email="seller@marketday.test", password="StrongPass!2026")
        self.other_user = User.objects.create_user(email="buyer@marketday.test", password="StrongPass!2026")
        User.objects.filter(pk__in=[self.seller.pk, self.other_user.pk]).update(email_verified_at=dj_timezone.now())
        self.seller.refresh_from_db(); self.other_user.refresh_from_db()
        self.category = Category.objects.get(name="Vehicles")
        self.subcategory = SubCategory.objects.get(category=self.category, name="Cars")
        self.other_category = Category.objects.get(name="Property")
        self.other_subcategory, _ = SubCategory.objects.get_or_create(category=self.other_category, name="Homes")
        self.county = County.objects.get(slug="montserrado")
        self.town = Town.objects.get(county=self.county, slug="monrovia")
        self.payload = {
            "title": "Toyota Corolla 2018",
            "description": "Clean, well-maintained car. Call to arrange a viewing.",
            "price": "8500.00",
            "currency": "USD",
            "condition": "used",
            "phone_number": "+231 770 123 456",
            "whatsapp_number": "+231 770 123 456",
            "category_id": self.category.id,
            "subcategory_id": self.subcategory.id,
            "county_id": self.county.id,
            "town_id": self.town.id,
        }

    def test_catalog_is_seeded_with_all_counties_and_categories(self):
        self.assertEqual(County.objects.count(), 15)
        self.assertEqual(Category.objects.count(), 18)
        response = self.client.get("/api/market/categories/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 18)
        towns = self.client.get("/api/market/towns/", {"county": "montserrado"})
        self.assertEqual(towns.status_code, 200)
        self.assertEqual(towns.data["results"][0]["name"], "Monrovia")

    def test_staff_can_manage_categories_and_deletion_is_soft(self):
        self.assertEqual(self.client.post("/api/market/categories/", {"name": "New Category"}, format="json").status_code, 401)
        self.client.force_authenticate(self.other_user)
        self.assertEqual(self.client.post("/api/market/categories/", {"name": "New Category"}, format="json").status_code, 403)
        staff = User.objects.create_user(email="staff@marketday.test", password="StrongPass!2026", is_staff=True)
        self.client.force_authenticate(staff)
        created = self.client.post("/api/market/categories/", {"name": "New Category", "description": "A test category"}, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        slug = created.data["slug"]
        updated = self.client.patch(f"/api/market/categories/{slug}/", {"description": "Updated category"}, format="json")
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(self.client.delete(f"/api/market/categories/{slug}/").status_code, 204)
        self.assertFalse(Category.objects.get(slug=slug).is_active)

    def test_create_ad_is_owner_managed_and_pending_ads_are_private(self):
        self.client.force_authenticate(self.seller)
        created = self.client.post("/api/market/advertisements/", self.payload, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        ad = Advertisement.objects.get(slug=created.data["slug"])
        self.assertEqual(ad.status, Advertisement.Status.PENDING)
        self.assertEqual(ad.seller, self.seller)
        self.assertEqual(self.client.get("/api/market/advertisements/").data["count"], 0)
        self.assertEqual(self.client.get("/api/market/advertisements/mine/").data["count"], 1)
        self.client.force_authenticate(self.other_user)
        denied = self.client.patch(f"/api/market/advertisements/{ad.slug}/", {"title": "Hijacked"}, format="json")
        self.assertEqual(denied.status_code, 403)

    def test_public_listings_filter_by_category_and_detail_tracks_views(self):
        vehicle = Advertisement.objects.create(seller=self.seller, category=self.category, subcategory=self.subcategory, county=self.county, town=self.town, status=Advertisement.Status.ACTIVE, **self.payload_without_ids())
        property_ad = Advertisement.objects.create(seller=self.seller, category=self.other_category, subcategory=self.other_subcategory, county=self.county, town=self.town, status=Advertisement.Status.ACTIVE, **{**self.payload_without_ids(), "title": "Home for rent"})
        all_ads = self.client.get("/api/market/advertisements/")
        self.assertEqual(all_ads.data["count"], 2)
        filtered = self.client.get("/api/market/advertisements/", {"category": "vehicles"})
        self.assertEqual(filtered.data["count"], 1)
        self.assertEqual(filtered.data["results"][0]["slug"], vehicle.slug)
        detail = self.client.get(f"/api/market/advertisements/{vehicle.slug}/")
        self.assertEqual(detail.status_code, 200)
        vehicle.refresh_from_db()
        self.assertEqual(vehicle.views_count, 1)
        self.assertNotEqual(vehicle.slug, property_ad.slug)
        popular = self.client.get("/api/market/advertisements/popular/")
        self.assertEqual(popular.status_code, 200)
        self.assertEqual(popular.data[0]["slug"], vehicle.slug)
        from datetime import timedelta
        from django.utils import timezone
        Promotion.objects.create(advertisement=vehicle, kind=Promotion.Kind.FEATURED, starts_at=timezone.now() - timedelta(hours=1), ends_at=timezone.now() + timedelta(days=2))
        promoted = self.client.get("/api/market/advertisements/promoted/")
        self.assertEqual(promoted.status_code, 200)
        self.assertEqual([item["slug"] for item in promoted.data], [vehicle.slug])

    def test_active_ad_edit_returns_to_moderation_and_owner_can_mark_sold(self):
        ad = Advertisement.objects.create(seller=self.seller, category=self.category, subcategory=self.subcategory, county=self.county, town=self.town, status=Advertisement.Status.ACTIVE, **self.payload_without_ids())
        self.client.force_authenticate(self.seller)
        edited = self.client.patch(f"/api/market/advertisements/{ad.slug}/", {"title": "Updated Corolla"}, format="json")
        self.assertEqual(edited.status_code, 200, edited.data)
        self.assertEqual(edited.data["status"], Advertisement.Status.PENDING)
        sold = self.client.post(f"/api/market/advertisements/{ad.slug}/sold/", format="json")
        self.assertEqual(sold.status_code, 200, sold.data)
        self.assertEqual(sold.data["status"], Advertisement.Status.SOLD)

    def test_rejects_mismatched_subcategory_and_invalid_image(self):
        self.client.force_authenticate(self.seller)
        mismatch = {**self.payload, "subcategory_id": self.other_subcategory.id}
        self.assertEqual(self.client.post("/api/market/advertisements/", mismatch, format="json").status_code, 400)
        bad_file = SimpleUploadedFile("not-an-image.txt", b"not an image", content_type="text/plain")
        invalid = self.client.post("/api/market/advertisements/", {**self.payload, "image_uploads": [bad_file]}, format="multipart")
        self.assertEqual(invalid.status_code, 400)

    def test_accepts_multiple_valid_images(self):
        def png_file(name):
            output = BytesIO()
            Image.new("RGB", (4, 4), color="green").save(output, format="PNG")
            return SimpleUploadedFile(name, output.getvalue(), content_type="image/png")
        self.client.force_authenticate(self.seller)
        with tempfile.TemporaryDirectory() as media_dir, override_settings(MEDIA_ROOT=media_dir):
            response = self.client.post("/api/market/advertisements/", {**self.payload, "image_uploads": [png_file("front.png"), png_file("side.png")]}, format="multipart")
            self.assertEqual(response.status_code, 201, response.data)
            ad = Advertisement.objects.get(slug=response.data["slug"])
            self.assertEqual(ad.images.count(), 2)
            for image in ad.images.all():
                image.image.delete(save=False)

    def payload_without_ids(self):
        return {key: value for key, value in self.payload.items() if not key.endswith("_id")}


class AdminDashboardApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(email="admin@marketday.test", password="StrongPass!2026", is_staff=True)
        self.seller = User.objects.create_user(email="seller-admin@marketday.test", password="StrongPass!2026", first_name="Korto")
        self.buyer = User.objects.create_user(email="buyer-admin@marketday.test", password="StrongPass!2026")
        from accounts.models import SellerProfile
        SellerProfile.objects.create(user=self.seller, business_name="Korto Market")
        self.category = Category.objects.get(name="Vehicles")
        self.subcategory = SubCategory.objects.get(category=self.category, name="Cars")
        self.county = County.objects.get(slug="montserrado")
        self.town = Town.objects.get(county=self.county, slug="monrovia")
        self.ad = Advertisement.objects.create(seller=self.seller, category=self.category, subcategory=self.subcategory, county=self.county, town=self.town, title="Used car", description="A car listing", price="5000.00", currency="USD", condition="used", phone_number="+231 770 123 456")

    def test_admin_dashboard_stats_and_permissions(self):
        denied = self.client.get("/api/admin/stats/")
        self.assertIn(denied.status_code, [401, 403])
        self.client.force_authenticate(self.staff)
        stats = self.client.get("/api/admin/stats/")
        self.assertEqual(stats.status_code, 200)
        self.assertEqual(stats.data["users"], 2)
        self.assertEqual(stats.data["sellers"], 1)
        self.client.force_authenticate(self.buyer)
        self.assertEqual(self.client.get("/api/admin/users/").status_code, 403)

    def test_admin_can_manage_users_sellers_ads_and_locations(self):
        self.client.force_authenticate(self.staff)
        suspended = self.client.post(f"/api/admin/users/{self.buyer.id}/status/", {"is_active": False}, format="json")
        self.assertEqual(suspended.status_code, 200, suspended.data)
        self.buyer.refresh_from_db()
        self.assertFalse(self.buyer.is_active)
        verified = self.client.post(f"/api/admin/sellers/{self.seller.seller_profile.id}/verification/", {"is_verified": True}, format="json")
        self.assertEqual(verified.status_code, 200, verified.data)
        self.assertTrue(self.seller.seller_profile.__class__.objects.get(pk=self.seller.seller_profile.id).is_verified)
        moderation = self.client.post(f"/api/admin/advertisements/{self.ad.id}/moderation/", {"status": "active"}, format="json")
        self.assertEqual(moderation.status_code, 200, moderation.data)
        self.assertEqual(moderation.data["status"], "active")
        town = self.client.post("/api/admin/towns/", {"name": "Paynesville", "county": self.county.id}, format="json")
        self.assertEqual(town.status_code, 201, town.data)
        self.assertEqual(town.data["slug"], "paynesville")
        category = self.client.post("/api/admin/categories/", {"name": "Staff Created Category"}, format="json")
        self.assertEqual(category.status_code, 201, category.data)
        subcategory = self.client.post("/api/admin/subcategories/", {"name": "Staff Created Subcategory", "category": category.data["id"]}, format="json")
        self.assertEqual(subcategory.status_code, 201, subcategory.data)
        self.assertEqual(subcategory.data["slug"], "staff-created-subcategory")

    def test_admin_can_resolve_reports_and_create_promotions_without_payment(self):
        self.ad.status = Advertisement.Status.ACTIVE
        self.ad.save(update_fields=["status"])
        self.client.force_authenticate(self.buyer)
        report_response = self.client.post("/api/market/reports/", {"advertisement_slug": self.ad.slug, "reason": "scam", "details": "Please review this listing."}, format="json")
        self.assertEqual(report_response.status_code, 201, report_response.data)
        report = Report.objects.get()
        self.client.force_authenticate(self.staff)
        resolved = self.client.post(f"/api/admin/reports/{report.id}/resolve/", {"status": "resolved", "resolution_note": "Reviewed by staff."}, format="json")
        self.assertEqual(resolved.status_code, 200, resolved.data)
        self.assertEqual(resolved.data["status"], Report.Status.RESOLVED)
        from django.utils import timezone
        from datetime import timedelta
        promotion = self.client.post("/api/admin/promotions/", {"advertisement_slug": self.ad.slug, "kind": "featured", "status": "active", "ends_at": (timezone.now() + timedelta(days=7)).isoformat()}, format="json")
        self.assertEqual(promotion.status_code, 201, promotion.data)
        self.assertEqual(Promotion.objects.count(), 1)
        self.assertEqual(promotion.data["kind"], Promotion.Kind.FEATURED)


class VerificationAndReportingTests(TestCase):
    def setUp(self):
        cache.clear()  # throttle counters live in the cache
        self.client = APIClient()
        self.seller = User.objects.create_user(email="verified-seller@marketday.test", password="StrongPass!2026", email_verified_at=dj_timezone.now())
        self.unverified = User.objects.create_user(email="new-user@marketday.test", password="StrongPass!2026")
        self.buyer = User.objects.create_user(email="verified-buyer@marketday.test", password="StrongPass!2026", email_verified_at=dj_timezone.now())
        category = Category.objects.get(name="Vehicles")
        subcategory = SubCategory.objects.get(category=category, name="Cars")
        county = County.objects.get(slug="montserrado")
        town = Town.objects.get(county=county, slug="monrovia")
        self.ad_fields = dict(category=category, subcategory=subcategory, county=county, town=town, title="Toyota Hilux", description="Good condition pickup.", price="9000.00", currency="USD", condition="used", phone_number="+231 770 123 456")
        self.ad = Advertisement.objects.create(seller=self.seller, status=Advertisement.Status.ACTIVE, **self.ad_fields)
        self.payload = {"title": "Honda Fit", "description": "Clean car, ready to drive.", "price": "4000.00", "currency": "USD", "condition": "used", "phone_number": "+231 770 123 456", "category_id": category.id, "subcategory_id": subcategory.id, "county_id": county.id, "town_id": town.id}

    def tearDown(self):
        cache.clear()

    def test_unverified_user_cannot_post_ads_or_message_but_can_browse(self):
        self.client.force_authenticate(self.unverified)
        self.assertEqual(self.client.post("/api/market/advertisements/", self.payload, format="json").status_code, 403)
        self.assertEqual(self.client.post("/api/market/messages/conversations/", {"advertisement_slug": self.ad.slug}, format="json").status_code, 403)
        self.assertEqual(self.client.get("/api/market/advertisements/").status_code, 200)
        self.assertEqual(self.client.get("/api/market/messages/conversations/").status_code, 200)
        self.client.force_authenticate(self.seller)
        self.assertEqual(self.client.post("/api/market/advertisements/", self.payload, format="json").status_code, 201)

    def test_unverified_participant_cannot_send_messages(self):
        conversation = Conversation.objects.create(advertisement=self.ad, buyer=self.unverified, seller=self.seller)
        self.client.force_authenticate(self.unverified)
        url = f"/api/market/messages/conversations/{conversation.id}/messages/"
        self.assertEqual(self.client.post(url, {"body": "Is this available?"}, format="json").status_code, 403)
        self.assertEqual(Message.objects.count(), 0)

    def test_conversations_are_private_to_their_participants(self):
        self.client.force_authenticate(self.buyer)
        started = self.client.post("/api/market/messages/conversations/", {"advertisement_slug": self.ad.slug}, format="json")
        self.assertEqual(started.status_code, 201, started.data)
        url = f"/api/market/messages/conversations/{started.data['id']}/messages/"
        self.assertEqual(self.client.post(url, {"body": "Is this still available?"}, format="json").status_code, 201)
        outsider = User.objects.create_user(email="outsider@marketday.test", password="StrongPass!2026", email_verified_at=dj_timezone.now())
        self.client.force_authenticate(outsider)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.post(url, {"body": "Hi"}, format="json").status_code, 404)
        self.assertEqual(self.client.get("/api/market/messages/conversations/").data, [])

    def test_reports_reject_duplicates_and_inactive_listings(self):
        self.client.force_authenticate(self.buyer)
        first = self.client.post("/api/market/reports/", {"advertisement_slug": self.ad.slug, "reason": "scam"}, format="json")
        self.assertEqual(first.status_code, 201, first.data)
        duplicate = self.client.post("/api/market/reports/", {"advertisement_slug": self.ad.slug, "reason": "scam"}, format="json")
        self.assertEqual(duplicate.status_code, 400)
        pending = Advertisement.objects.create(seller=self.seller, status=Advertisement.Status.PENDING, **{**self.ad_fields, "title": "Pending car"})
        self.assertEqual(self.client.post("/api/market/reports/", {"advertisement_slug": pending.slug, "reason": "scam"}, format="json").status_code, 400)
        self.assertEqual(Report.objects.count(), 1)

    def test_resend_verification_email_is_rate_limited(self):
        from django.core import mail
        self.client.force_authenticate(self.unverified)
        codes = [self.client.post("/api/auth/email/verify/").status_code for _ in range(6)]
        self.assertEqual(codes[:5], [200] * 5)
        self.assertEqual(codes[5], 429)
        self.assertEqual(len(mail.outbox), 5)
        self.client.force_authenticate(self.seller)
        self.client.post("/api/auth/email/verify/")
        self.assertEqual(len(mail.outbox), 5)  # already verified: no email sent
