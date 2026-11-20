from django.core import mail
from django.contrib.auth.tokens import default_token_generator
from django.test import TestCase
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient
from django.utils import timezone
from .email_verification import send_verification_email
from .models import User

class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.payload = {"email": "seller@example.com", "first_name": "Amara", "last_name": "Doe", "password": "StrongPass!2026", "phone_number": "+231770000000", "seller_name": "Amara Goods"}
    def test_register_login_profile_and_logout(self):
        response = self.client.post("/api/auth/register/", self.payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        user = User.objects.get(email="seller@example.com")
        User.objects.filter(pk=user.pk).update(email_verified_at=timezone.now())
        self.assertTrue(user.check_password(self.payload["password"]))
        self.assertEqual(user.profile.country_code, "+231")
        self.assertEqual(user.seller_profile.business_name, "Amara Goods")
        tokens = self.client.post("/api/auth/token/", {"email": self.payload["email"], "password": self.payload["password"]}, format="json")
        self.assertEqual(tokens.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens.data['access']}")
        self.assertEqual(self.client.get("/api/auth/profile/").data["email"], self.payload["email"])
        self.assertEqual(self.client.post("/api/auth/logout/", {"refresh": tokens.data["refresh"]}, format="json").status_code, 204)
    def test_password_reset_request_does_not_disclose_unknown_email(self):
        response = self.client.post("/api/auth/password-reset/", {"email": "missing@example.com"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)
    def test_password_reset_confirmation_changes_password(self):
        user = User.objects.create_user(email="reset@example.com", password="OldStrong!2026")
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        response = self.client.post("/api/auth/password-reset/confirm/", {"uid": uid, "token": token, "new_password": "NewStrong!2026"}, format="json")
        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password("NewStrong!2026"))
        login = self.client.post("/api/auth/token/", {"email": user.email, "password": "NewStrong!2026"}, format="json")
        self.assertEqual(login.status_code, 200)
    def test_email_verification_confirms_account(self):
        user = User.objects.create_user(email="verify@example.com", password="StrongPass!2026")
        send_verification_email(user)
        token = mail.outbox[-1].body.split("token=")[1].split()[0]
        response = self.client.post("/api/auth/email/verify/confirm/", {"token": token}, format="json")
        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertIsNotNone(user.email_verified_at)


class CaseInsensitiveSignInTests(TestCase):
    def test_sign_in_ignores_email_capitalisation(self):
        User.objects.create_user(email="mixed@example.com", password="StrongPass!2026", is_staff=True)
        client = APIClient()
        response = client.post("/api/auth/token/", {"email": "Mixed@Example.com", "password": "StrongPass!2026"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        # Django admin login uses the same lookup
        self.assertTrue(self.client.login(username="MIXED@example.com", password="StrongPass!2026"))
        self.assertFalse(self.client.login(username="mixed@example.com", password="wrong-password"))
