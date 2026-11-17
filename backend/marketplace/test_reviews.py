from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User

from .models import Advertisement, Category, Conversation, County, Message, Review, SubCategory, Town

PASSWORD = "StrongPass!2026"


class SellerReviewTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        now = timezone.now()
        self.seller = User.objects.create_user(email="seller@example.com", password=PASSWORD, first_name="Comfort", email_verified_at=now)
        self.buyer = User.objects.create_user(email="buyer@example.com", password=PASSWORD, first_name="Musu", last_name="Toe", phone_number="+231770123456", phone_verified_at=now)
        category = Category.objects.get(name="Vehicles")
        county = County.objects.get(slug="montserrado")
        self.ad = Advertisement.objects.create(seller=self.seller, status=Advertisement.Status.ACTIVE, category=category, subcategory=SubCategory.objects.get(category=category, name="Cars"), county=county, town=Town.objects.get(county=county, slug="monrovia"), title="Toyota Hilux", description="Good pickup.", price="9000.00", currency="USD", condition="used", phone_number="+231 770 123 456")
        self.conversation = Conversation.objects.create(advertisement=self.ad, buyer=self.buyer, seller=self.seller)
        Message.objects.create(conversation=self.conversation, sender=self.buyer, body="Still available?")
        self.url = f"/api/market/messages/conversations/{self.conversation.id}/review/"

    def tearDown(self):
        cache.clear()

    def test_buyer_can_review_only_after_the_seller_replies(self):
        self.client.force_authenticate(self.buyer)
        self.assertFalse(self.client.get(self.url).data["can_review"])
        self.assertEqual(self.client.put(self.url, {"rating": 5}, format="json").status_code, 400)
        Message.objects.create(conversation=self.conversation, sender=self.seller, body="Yes, come see it.")
        self.assertTrue(self.client.get(self.url).data["can_review"])
        created = self.client.put(self.url, {"rating": 5, "comment": "Honest seller, car as described."}, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        edited = self.client.put(self.url, {"rating": 4, "comment": "Good."}, format="json")
        self.assertEqual(edited.status_code, 200)
        self.assertEqual(Review.objects.count(), 1)

        public = APIClient().get(f"/api/market/advertisements/{self.ad.slug}/reviews/").data
        self.assertEqual((public["average"], public["count"]), (4.0, 1))
        self.assertEqual(public["reviews"][0]["reviewer_name"], "Musu T.")
        self.assertNotIn("buyer@example.com", str(public))

    def test_only_the_buyer_can_review_and_ratings_are_1_to_5(self):
        Message.objects.create(conversation=self.conversation, sender=self.seller, body="Yes.")
        self.client.force_authenticate(self.seller)
        self.assertEqual(self.client.put(self.url, {"rating": 5}, format="json").status_code, 404)  # sellers can't rate themselves
        outsider = User.objects.create_user(email="x@example.com", password=PASSWORD, email_verified_at=timezone.now())
        self.client.force_authenticate(outsider)
        self.assertEqual(self.client.put(self.url, {"rating": 5}, format="json").status_code, 404)
        self.client.force_authenticate(self.buyer)
        for bad in (0, 6):
            self.assertEqual(self.client.put(self.url, {"rating": bad}, format="json").status_code, 400)

    def test_hidden_reviews_do_not_count(self):
        Message.objects.create(conversation=self.conversation, sender=self.seller, body="Yes.")
        self.client.force_authenticate(self.buyer)
        self.client.put(self.url, {"rating": 1, "comment": "spam"}, format="json")
        Review.objects.update(is_hidden=True)
        public = APIClient().get(f"/api/market/advertisements/{self.ad.slug}/reviews/").data
        self.assertEqual((public["average"], public["count"], public["reviews"]), (None, 0, []))

    def test_buyer_can_delete_their_review(self):
        Message.objects.create(conversation=self.conversation, sender=self.seller, body="Yes.")
        self.client.force_authenticate(self.buyer)
        self.client.put(self.url, {"rating": 3}, format="json")
        self.assertEqual(self.client.delete(self.url).status_code, 204)
        self.assertEqual(Review.objects.count(), 0)
