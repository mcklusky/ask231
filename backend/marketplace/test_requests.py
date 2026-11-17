from datetime import timedelta

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts import sms
from accounts.models import User

from .models import BuyerRequest, Category, Conversation, County, Message, Town

PASSWORD = "StrongPass!2026"


class LookingForRequestTests(TestCase):
    def setUp(self):
        cache.clear()
        sms.outbox.clear()
        self.client = APIClient()
        now = timezone.now()
        self.asker = User.objects.create_user(phone_number="+231770123456", phone_verified_at=now, password=PASSWORD, first_name="Musu", last_name="Toe")
        self.helper = User.objects.create_user(email="plumber@example.com", email_verified_at=now, password=PASSWORD, first_name="James")
        self.county = County.objects.get(slug="montserrado")
        self.town = Town.objects.get(county=self.county, slug="monrovia")
        self.services = Category.objects.get(slug="services")

    def tearDown(self):
        cache.clear()

    def post_request(self, **extra):
        self.client.force_authenticate(self.asker)
        payload = {"title": "Need a plumber in Sinkor", "description": "Kitchen pipe leaking.", "category_id": self.services.id, "town_id": self.town.id, "budget": "40", "currency": "USD", **extra}
        return self.client.post("/api/market/requests/", payload, format="json")

    def test_post_browse_and_filter_requests(self):
        created = self.post_request()
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data["location"], "Monrovia, Montserrado")  # county filled in from the town
        public = APIClient()
        listing = public.get("/api/market/requests/").data["results"]
        self.assertEqual([r["title"] for r in listing], ["Need a plumber in Sinkor"])
        self.assertIsNone(listing[0]["responses_count"])  # only the asker sees the count
        self.assertTrue(listing[0]["requester_phone_verified"])
        self.assertEqual(len(public.get("/api/market/requests/", {"q": "plumber"}).data["results"]), 1)
        self.assertEqual(len(public.get("/api/market/requests/", {"q": "generator"}).data["results"]), 0)
        self.assertEqual(len(public.get("/api/market/requests/", {"category": "services", "county": "montserrado"}).data["results"]), 1)

    def test_unverified_members_cannot_post(self):
        newbie = User.objects.create_user(email="new@example.com", password=PASSWORD)
        self.client.force_authenticate(newbie)
        self.assertEqual(self.client.post("/api/market/requests/", {"title": "Need a car"}, format="json").status_code, 403)

    def test_responding_opens_a_chat_and_alerts_the_asker(self):
        request_id = self.post_request().data["id"]
        self.client.force_authenticate(self.helper)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(f"/api/market/requests/{request_id}/respond/", {"body": "I can fix it today, 25 USD."}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["listing_title"], "Looking for: Need a plumber in Sinkor")
        self.assertEqual(response.data["request_id"], request_id)
        conversation = Conversation.objects.get()
        self.assertEqual((conversation.buyer, conversation.seller), (self.asker, self.helper))
        self.assertEqual(sms.outbox[-1]["to"], "+231770123456")
        # A second reply reuses the same chat.
        self.client.post(f"/api/market/requests/{request_id}/respond/", {"body": "Also can bring parts."}, format="json")
        self.assertEqual(Conversation.objects.count(), 1)
        self.assertEqual(Message.objects.count(), 2)
        # The asker sees it in their inbox and how many people replied.
        self.client.force_authenticate(self.asker)
        inbox = self.client.get("/api/market/messages/conversations/").data
        self.assertEqual(inbox[0]["listing_title"], "Looking for: Need a plumber in Sinkor")
        self.assertEqual(self.client.get("/api/market/requests/mine/").data[0]["responses_count"], 1)

    def test_cannot_respond_to_own_or_closed_requests(self):
        request_id = self.post_request().data["id"]
        self.assertEqual(self.client.post(f"/api/market/requests/{request_id}/respond/", {"body": "hi"}, format="json").status_code, 400)
        self.assertEqual(self.client.patch(f"/api/market/requests/{request_id}/", {"status": "closed"}, format="json").status_code, 200)
        self.assertEqual(APIClient().get("/api/market/requests/").data["results"], [])
        self.client.force_authenticate(self.helper)
        self.assertEqual(self.client.post(f"/api/market/requests/{request_id}/respond/", {"body": "hi"}, format="json").status_code, 404)
        self.assertEqual(self.client.patch(f"/api/market/requests/{request_id}/", {"status": "open"}, format="json").status_code, 404)  # not theirs

    def test_expired_requests_are_hidden_and_open_requests_are_capped(self):
        request_id = self.post_request().data["id"]
        BuyerRequest.objects.filter(pk=request_id).update(expires_at=timezone.now() - timedelta(days=1))
        self.assertEqual(APIClient().get("/api/market/requests/").data["results"], [])
        for n in range(BuyerRequest.MAX_OPEN_PER_MEMBER):
            self.assertEqual(self.post_request(title=f"Request number {n}").status_code, 201)
        self.assertEqual(self.post_request(title="One too many").status_code, 400)
