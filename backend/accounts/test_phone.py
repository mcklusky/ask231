import re
from datetime import timedelta

from django.core import mail
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from . import sms
from .models import PhoneCode, User
from .phone import normalize_phone

PASSWORD = "StrongPass!2026"


class PhoneSignInTests(TestCase):
    def setUp(self):
        cache.clear()
        sms.outbox.clear()
        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    def last_code(self):
        return re.search(r"\b(\d{6})\b", sms.outbox[-1]["body"]).group(1)

    def register_by_phone(self, phone="0770 123 456", **extra):
        response = self.client.post("/api/auth/register/", {"first_name": "Musu", "last_name": "Toe", "phone_number": phone, "password": PASSWORD, **extra}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return User.objects.get(phone_number="+231770123456")

    def sign_in(self, identifier, password=PASSWORD):
        return self.client.post("/api/auth/token/", {"email": identifier, "password": password}, format="json")

    def authenticate(self, identifier="0770123456"):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.sign_in(identifier).data['access']}")

    def test_normalize_phone_accepts_common_liberian_formats(self):
        for value in ["+231 770 123 456", "0770123456", "770123456", "231770123456", "00231770123456", "+231 0770 123 456"]:
            self.assertEqual(normalize_phone(value), "+231770123456", value)
        self.assertEqual(normalize_phone("+1 (202) 555-0101"), "+12025550101")
        for bad in ["", "12", "+231 12"]:
            with self.assertRaises(ValidationError):
                normalize_phone(bad)

    def test_sign_up_with_phone_only_verify_by_sms_and_sign_in_with_phone(self):
        user = self.register_by_phone()
        self.assertIsNone(user.email)
        self.assertIsNone(user.phone_verified_at)
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(sms.outbox[-1]["to"], "+231770123456")
        self.assertEqual(user.profile.phone_number, "+231 770 123 456")

        tokens = self.sign_in("+231 770 123 456")
        self.assertEqual(tokens.status_code, 200, tokens.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens.data['access']}")
        profile = self.client.get("/api/auth/profile/").data
        self.assertEqual((profile["email"], profile["login_phone"], profile["phone_verified"]), ("", "+231770123456", False))

        self.assertEqual(self.client.post("/api/auth/phone/verify/", {"code": "000000" if self.last_code() != "000000" else "111111"}, format="json").status_code, 400)
        verified = self.client.post("/api/auth/phone/verify/", {"code": self.last_code()}, format="json")
        self.assertEqual(verified.status_code, 200, verified.data)
        self.assertTrue(verified.data["phone_verified"])
        self.assertEqual(self.sign_in("0770123456").status_code, 200)
        self.assertEqual(self.sign_in("0770123456", "wrong-password").status_code, 401)

    def test_verified_phone_unlocks_posting_and_messaging(self):
        user = self.register_by_phone()
        self.authenticate()
        self.assertEqual(self.client.post("/api/market/messages/conversations/", {"advertisement_slug": "anything"}, format="json").status_code, 403)
        User.objects.filter(pk=user.pk).update(phone_verified_at=timezone.now())
        # Past the verification check now: the listing simply doesn't exist.
        self.assertEqual(self.client.post("/api/market/messages/conversations/", {"advertisement_slug": "anything"}, format="json").status_code, 404)

    def test_a_code_stops_working_after_five_wrong_tries(self):
        self.register_by_phone()
        self.authenticate()
        code = self.last_code()
        wrong = "999999" if code != "999999" else "111111"
        for _ in range(5):
            self.client.post("/api/auth/phone/verify/", {"code": wrong}, format="json")
        self.assertEqual(self.client.post("/api/auth/phone/verify/", {"code": code}, format="json").status_code, 400)

    def test_resend_waits_a_minute(self):
        self.register_by_phone()
        self.authenticate()
        self.assertEqual(self.client.post("/api/auth/phone/send-code/", {}, format="json").status_code, 429)
        self.assertEqual(len(sms.outbox), 1)
        PhoneCode.objects.update(created_at=timezone.now() - timedelta(minutes=2))
        self.assertEqual(self.client.post("/api/auth/phone/send-code/", {}, format="json").status_code, 200)
        self.assertEqual(len(sms.outbox), 2)

    def test_unverified_claim_on_a_number_does_not_block_its_owner(self):
        squatter = self.register_by_phone()
        PhoneCode.objects.update(created_at=timezone.now() - timedelta(minutes=5))
        response = self.client.post("/api/auth/register/", {"first_name": "Real", "last_name": "Owner", "phone_number": "+231770123456", "email": "owner@example.com", "password": PASSWORD}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        squatter.refresh_from_db()
        self.assertIsNone(squatter.phone_number)
        self.assertEqual(User.objects.get(phone_number="+231770123456").email, "owner@example.com")

    def test_verified_number_cannot_be_registered_again(self):
        user = self.register_by_phone()
        User.objects.filter(pk=user.pk).update(phone_verified_at=timezone.now())
        response = self.client.post("/api/auth/register/", {"first_name": "A", "last_name": "B", "phone_number": "0770123456", "password": PASSWORD}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("phone_number", response.data)

    def test_change_number_keeps_old_one_until_new_code_confirmed(self):
        user = self.register_by_phone()
        User.objects.filter(pk=user.pk).update(phone_verified_at=timezone.now())
        self.authenticate()
        sent = self.client.post("/api/auth/phone/send-code/", {"phone_number": "0886 555 444"}, format="json")
        self.assertEqual(sent.status_code, 200, sent.data)
        user.refresh_from_db()
        self.assertEqual(user.phone_number, "+231770123456")
        self.assertEqual(self.client.post("/api/auth/phone/verify/", {"code": self.last_code()}, format="json").status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.phone_number, "+231886555444")
        self.assertIsNotNone(user.phone_verified_at)

    def test_password_reset_by_sms(self):
        self.register_by_phone()
        PhoneCode.objects.update(created_at=timezone.now() - timedelta(minutes=5))
        response = self.client.post("/api/auth/password-reset/", {"phone_number": "0770123456"}, format="json")
        self.assertEqual(response.status_code, 200)
        unknown = self.client.post("/api/auth/password-reset/", {"phone_number": "0880000000"}, format="json")
        self.assertEqual(unknown.data, response.data)  # no hint whether a number has an account
        code = self.last_code()
        wrong = "000000" if code != "000000" else "111111"
        bad = self.client.post("/api/auth/password-reset/phone/", {"phone_number": "0770123456", "code": wrong, "new_password": "AnotherPass!2026"}, format="json")
        self.assertEqual(bad.status_code, 400)
        done = self.client.post("/api/auth/password-reset/phone/", {"phone_number": "0770123456", "code": code, "new_password": "AnotherPass!2026"}, format="json")
        self.assertEqual(done.status_code, 200, done.data)
        self.assertEqual(self.sign_in("0770123456", "AnotherPass!2026").status_code, 200)
        self.assertIsNotNone(User.objects.get(phone_number="+231770123456").phone_verified_at)

    def test_registration_needs_email_or_phone(self):
        response = self.client.post("/api/auth/register/", {"first_name": "A", "last_name": "B", "password": PASSWORD}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_seller_email_is_never_shown_on_ads(self):
        from marketplace.models import Advertisement, Category, County, SubCategory, Town
        seller = User.objects.create_user(email="private@example.com", password=PASSWORD, email_verified_at=timezone.now())
        category = Category.objects.get(name="Vehicles")
        county = County.objects.get(slug="montserrado")
        ad = Advertisement.objects.create(seller=seller, status=Advertisement.Status.ACTIVE, category=category, subcategory=SubCategory.objects.get(category=category, name="Cars"), county=county, town=Town.objects.get(county=county, slug="monrovia"), title="Toyota Hilux", description="Good pickup.", price="9000.00", currency="USD", condition="used", phone_number="+231 770 123 456")
        data = self.client.get(f"/api/market/advertisements/{ad.slug}/").data
        self.assertEqual(data["seller_name"], "Ask231 seller")
        self.assertNotIn("private@example.com", str(data))
        self.assertFalse(data["seller_phone_verified"])

    def test_new_message_texts_a_phone_verified_seller(self):
        from marketplace.models import Advertisement, Category, Conversation, County, SubCategory, Town
        seller = self.register_by_phone()
        User.objects.filter(pk=seller.pk).update(phone_verified_at=timezone.now())
        seller.refresh_from_db()
        sms.outbox.clear()
        buyer = User.objects.create_user(email="buyer@example.com", password=PASSWORD, first_name="Kofi", email_verified_at=timezone.now())
        category = Category.objects.get(name="Vehicles")
        county = County.objects.get(slug="montserrado")
        ad = Advertisement.objects.create(seller=seller, status=Advertisement.Status.ACTIVE, category=category, subcategory=SubCategory.objects.get(category=category, name="Cars"), county=county, town=Town.objects.get(county=county, slug="monrovia"), title="Toyota Hilux", description="Good pickup.", price="9000.00", currency="USD", condition="used", phone_number="+231 770 123 456")
        conversation = Conversation.objects.create(advertisement=ad, buyer=buyer, seller=seller)
        self.client.force_authenticate(buyer)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(f"/api/market/messages/conversations/{conversation.id}/messages/", {"body": "Still available?"}, format="json")
        self.assertEqual(len(sms.outbox), 1)
        self.assertEqual(sms.outbox[0]["to"], "+231770123456")
        self.assertIn("Toyota Hilux", sms.outbox[0]["body"])
        self.assertIn(f"/messages/{conversation.id}", sms.outbox[0]["body"])
        self.assertEqual(len(mail.outbox), 0)  # no email address on this account

        seller.profile.sms_on_new_message = False
        seller.profile.save()
        self.client.force_authenticate(seller)
        self.client.get(f"/api/market/messages/conversations/{conversation.id}/messages/")
        self.client.force_authenticate(buyer)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(f"/api/market/messages/conversations/{conversation.id}/messages/", {"body": "Hello?"}, format="json")
        self.assertEqual(len(sms.outbox), 1)  # turned off
