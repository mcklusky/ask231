import io
import json
import urllib.parse
from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User

from . import facebook
from .models import Advertisement, Category, County, SubCategory, Town


class InlineThread:
    """Runs the background job immediately so tests can see the result."""
    def __init__(self, target, **kwargs):
        self.target = target

    def start(self):
        self.target()


def fake_graph(post_id="123_456"):
    calls = []

    def urlopen(request, timeout=None):
        calls.append({"url": request.full_url, "data": urllib.parse.parse_qs(request.data.decode())})
        return io.BytesIO(json.dumps({"id": post_id}).encode())
    return calls, urlopen


@override_settings(FACEBOOK_PAGE_ID="98765", FACEBOOK_PAGE_TOKEN="page-token", SHARE_BASE_URL="https://marketday.example")
class FacebookAutoPostTests(TestCase):
    def setUp(self):
        cache.clear()
        self.staff = User.objects.create_user(email="staff@example.com", password="StrongPass!2026", is_staff=True, email_verified_at=timezone.now())
        seller = User.objects.create_user(email="seller@example.com", password="StrongPass!2026", email_verified_at=timezone.now())
        category = Category.objects.get(name="Vehicles")
        county = County.objects.get(slug="montserrado")
        self.ad = Advertisement.objects.create(seller=seller, category=category, subcategory=SubCategory.objects.get(category=category, name="Cars"), county=county,
                                              town=Town.objects.get(county=county, slug="monrovia"), title="Toyota Hilux", description="Good pickup.", price="9500.00",
                                              currency="USD", condition="used", phone_number="+231 770 123 456", landmark="Red Light")
        self.client = APIClient()
        self.client.force_authenticate(self.staff)

    def tearDown(self):
        cache.clear()

    def approve(self):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(f"/api/admin/advertisements/{self.ad.id}/moderation/", {"status": "active"}, format="json")

    def test_approving_an_ad_posts_it_once_to_the_facebook_page(self):
        calls, urlopen = fake_graph()
        with mock.patch.object(facebook.threading, "Thread", InlineThread), mock.patch.object(facebook.urllib.request, "urlopen", urlopen):
            self.assertEqual(self.approve().status_code, 200)
            self.assertEqual(len(calls), 1)
            self.assertEqual(calls[0]["url"], "https://graph.facebook.com/v21.0/98765/feed")
            self.assertEqual(calls[0]["data"]["link"], [f"https://marketday.example/s/{self.ad.slug}/"])
            message = calls[0]["data"]["message"][0]
            self.assertIn("Toyota Hilux", message)
            self.assertIn("US$9,500", message)
            self.assertIn("Monrovia, Montserrado (Red Light)", message)
            self.ad.refresh_from_db()
            self.assertEqual(self.ad.facebook_post_id, "123_456")
            # Suspending and re-approving does not post it again.
            self.client.post(f"/api/admin/advertisements/{self.ad.id}/moderation/", {"status": "suspended", "rejection_reason": "check"}, format="json")
            self.approve()
            self.assertEqual(len(calls), 1)

    def test_facebook_errors_never_block_moderation(self):
        def broken(request, timeout=None):
            raise facebook.urllib.error.URLError("no network")
        with mock.patch.object(facebook.threading, "Thread", InlineThread), mock.patch.object(facebook.urllib.request, "urlopen", broken), self.assertLogs("marketplace.facebook", "ERROR"):
            self.assertEqual(self.approve().status_code, 200)
        self.ad.refresh_from_db()
        self.assertEqual((self.ad.status, self.ad.facebook_post_id), ("active", ""))

    @override_settings(FACEBOOK_PAGE_ID="", FACEBOOK_PAGE_TOKEN="")
    def test_nothing_is_posted_until_facebook_is_configured(self):
        calls, urlopen = fake_graph()
        with mock.patch.object(facebook.threading, "Thread", InlineThread), mock.patch.object(facebook.urllib.request, "urlopen", urlopen):
            self.approve()
        self.assertEqual(calls, [])

    def test_django_admin_bulk_approval_also_posts(self):
        from django.contrib.admin.sites import site
        from .admin import approve_advertisements
        calls, urlopen = fake_graph()
        with mock.patch.object(facebook.threading, "Thread", InlineThread), mock.patch.object(facebook.urllib.request, "urlopen", urlopen):
            with self.captureOnCommitCallbacks(execute=True):
                approve_advertisements(site._registry[Advertisement], None, Advertisement.objects.filter(pk=self.ad.pk))
        self.assertEqual(len(calls), 1)
