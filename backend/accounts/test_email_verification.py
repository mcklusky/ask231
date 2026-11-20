import json
import re
from datetime import timedelta
from unittest import mock

from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .email_verification import send_verification_email
from .models import EmailVerificationToken, User

PASSWORD = "StrongPass!2026"


class EmailVerificationFlowTests(TestCase):
    def setUp(self):
        cache.clear()  # throttle counters live in the cache
        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    def register(self, email="amara@example.com", **extra):
        return self.client.post("/api/auth/register/", {"first_name": "Amara", "last_name": "Doe", "email": email, "password": PASSWORD, **extra}, format="json")

    def sign_in(self, identifier="amara@example.com", password=PASSWORD):
        return self.client.post("/api/auth/token/", {"email": identifier, "password": password}, format="json")

    def token_from(self, message):
        return re.search(r"verify-email\?token=([\w-]+)", message.body).group(1)

    def confirm(self, token):
        return self.client.post("/api/auth/email/verify/confirm/", {"token": token}, format="json")

    def age_links(self, minutes=2):
        EmailVerificationToken.objects.update(created_at=timezone.now() - timedelta(minutes=minutes))

    # --- registration ---------------------------------------------------------------------
    @override_settings(EMAIL_FROM_NAME="")  # subject falls back to SITE_NAME, whatever the local .env says
    def test_registration_creates_an_unverified_account_and_emails_a_link(self):
        response = self.register()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data["email_verification_required"])
        self.assertTrue(response.data["email_sent"])
        self.assertIn("amara@example.com", response.data["detail"])
        self.assertNotIn("token", json.dumps(response.data))  # the link only goes to the inbox
        user = User.objects.get(email="amara@example.com")
        self.assertTrue(user.email_verification_required)
        self.assertIsNone(user.email_verified_at)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ["amara@example.com"])
        self.assertEqual(message.subject, "Verify your ask231 account")
        html = message.alternatives[0][0]
        token = self.token_from(message)
        self.assertIn(f"/verify-email?token={token}", html)
        self.assertIn("Hi Amara", html)
        self.assertIn("24 hours", message.body)
        stored = EmailVerificationToken.objects.get(user=user)
        self.assertNotEqual(stored.token_hash, token)  # only a hash is stored
        self.assertEqual(len(stored.token_hash), 64)

    @override_settings(EMAIL_FROM_NAME="Ask231")
    def test_subject_uses_the_sender_name(self):
        self.register()
        self.assertEqual(mail.outbox[0].subject, "Verify your Ask231 account")

    def test_duplicate_email_is_rejected_whatever_the_capitalisation(self):
        self.register()
        response = self.register(email="AMARA@Example.com")
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)
        self.assertEqual(User.objects.count(), 1)

    def test_registration_still_succeeds_when_the_email_cannot_be_sent(self):
        with mock.patch("django.core.mail.EmailMultiAlternatives.send", side_effect=OSError("down")), self.assertLogs("accounts.email_verification", "ERROR"):
            response = self.register()
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.data["email_sent"])
        self.assertTrue(User.objects.filter(email="amara@example.com").exists())

    # --- sign-in before and after ---------------------------------------------------------
    def test_cannot_sign_in_before_verifying(self):
        self.register()
        response = self.sign_in()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["code"], "email_not_verified")
        self.assertEqual(response.data["email"], "amara@example.com")
        self.assertNotIn("access", response.data)

    def test_wrong_password_gives_the_usual_answer_for_unverified_accounts(self):
        self.register()
        response = self.sign_in(password="wrong-password")
        self.assertEqual(response.status_code, 401)
        self.assertNotIn("email", response.data)

    def test_verifying_signs_you_in_once(self):
        self.register()
        token = self.token_from(mail.outbox[0])
        response = self.confirm(token)
        self.assertEqual(response.status_code, 200, response.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        profile = self.client.get("/api/auth/profile/")
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.data["email"], "amara@example.com")
        self.assertTrue(profile.data["email_verified"])
        self.client.credentials()
        again = self.confirm(token)  # a used link never hands out another sign-in
        self.assertEqual(again.status_code, 400)
        self.assertNotIn("access", again.data)

    def test_failed_links_never_sign_anyone_in(self):
        self.register()
        EmailVerificationToken.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        for response in [self.confirm(self.token_from(mail.outbox[0])), self.confirm("not-a-real-token")]:
            self.assertEqual(response.status_code, 400)
            self.assertNotIn("access", response.data)
            self.assertNotIn("refresh", response.data)

    def test_verifying_then_signing_in(self):
        self.register()
        response = self.confirm(self.token_from(mail.outbox[0]))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["code"], "verified")
        user = User.objects.get(email="amara@example.com")
        self.assertIsNotNone(user.email_verified_at)
        tokens = self.sign_in()
        self.assertEqual(tokens.status_code, 200, tokens.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens.data['access']}")
        profile = self.client.get("/api/auth/profile/")
        self.assertEqual(profile.status_code, 200)
        self.assertTrue(profile.data["email_verified"])
        status = self.client.get("/api/auth/email/verify/")
        self.assertEqual(status.data, {"email": "amara@example.com", "email_verified": True})

    def test_api_tokens_stop_working_for_unverified_accounts(self):
        """Even a valid token (e.g. made by hand) can't reach protected endpoints until the email is verified."""
        from rest_framework_simplejwt.tokens import RefreshToken
        self.register()
        user = User.objects.get(email="amara@example.com")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
        response = self.client.get("/api/auth/profile/")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["detail"].code, "email_not_verified")

    def test_older_accounts_keep_signing_in_without_verifying(self):
        User.objects.create_user(email="old@example.com", password=PASSWORD)
        self.assertEqual(self.sign_in("old@example.com").status_code, 200)

    # --- bad links ------------------------------------------------------------------------
    def test_invalid_token(self):
        self.register()
        for token in ["not-a-real-token", "x" * 300, ""]:
            response = self.confirm(token)
            self.assertEqual(response.status_code, 400, token)
        self.assertIsNone(User.objects.get().email_verified_at)

    def test_expired_token(self):
        self.register()
        EmailVerificationToken.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        response = self.confirm(self.token_from(mail.outbox[0]))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "expired")
        self.assertIsNone(User.objects.get().email_verified_at)

    def test_a_link_works_only_once(self):
        self.register()
        token = self.token_from(mail.outbox[0])
        self.assertEqual(self.confirm(token).status_code, 200)
        again = self.confirm(token)
        self.assertEqual(again.status_code, 400)
        self.assertEqual(again.data["code"], "already_verified")
        self.assertIsNotNone(EmailVerificationToken.objects.get().used_at)

    def test_a_new_link_cancels_the_old_one(self):
        self.register()
        old = self.token_from(mail.outbox[0])
        self.age_links()
        self.client.post("/api/auth/email/verify/resend/", {"email": "amara@example.com"}, format="json")
        new = self.token_from(mail.outbox[1])
        response = self.confirm(old)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "used")
        self.assertEqual(self.confirm(new).status_code, 200)

    def test_link_does_not_verify_a_changed_address(self):
        user = User.objects.create_user(email="first@example.com", password=PASSWORD, email_verification_required=True)
        send_verification_email(user)
        User.objects.filter(pk=user.pk).update(email="second@example.com")
        self.assertEqual(self.confirm(self.token_from(mail.outbox[0])).status_code, 400)
        user.refresh_from_db()
        self.assertIsNone(user.email_verified_at)

    # --- resend ---------------------------------------------------------------------------
    def test_resend_sends_a_new_link_to_unverified_accounts(self):
        self.register()
        self.age_links()
        response = self.client.post("/api/auth/email/verify/resend/", {"email": "Amara@Example.com"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 2)

    def test_resend_gives_the_same_answer_for_unknown_and_verified_addresses(self):
        self.register()
        self.age_links()
        User.objects.create_user(email="verified@example.com", password=PASSWORD, email_verified_at=timezone.now())
        answers = [self.client.post("/api/auth/email/verify/resend/", {"email": email}, format="json") for email in ["amara@example.com", "nobody@example.com", "verified@example.com"]]
        self.assertEqual({a.status_code for a in answers}, {200})
        self.assertEqual(len({a.data["detail"] for a in answers}), 1)
        self.assertEqual(len(mail.outbox), 2)  # sign-up email + one resend; nothing for the others

    def test_resend_waits_a_minute_between_links(self):
        self.register()
        self.client.post("/api/auth/email/verify/resend/", {"email": "amara@example.com"}, format="json")
        self.assertEqual(len(mail.outbox), 1)  # the sign-up link was just sent
        self.age_links()
        self.client.post("/api/auth/email/verify/resend/", {"email": "amara@example.com"}, format="json")
        self.assertEqual(len(mail.outbox), 2)

    def test_at_most_five_links_a_day_per_account(self):
        self.register()
        for _ in range(8):
            self.age_links()
            self.client.post("/api/auth/email/verify/resend/", {"email": "amara@example.com"}, format="json")
            cache.clear()  # isolate the per-account limit from the per-IP one
        self.assertEqual(len(mail.outbox), 5)

    def test_resend_is_rate_limited_per_ip(self):
        codes = [self.client.post("/api/auth/email/verify/resend/", {"email": f"user{n}@example.com"}, format="json").status_code for n in range(6)]
        self.assertEqual(codes, [200] * 5 + [429])

    def test_resend_needs_a_valid_email(self):
        self.assertEqual(self.client.post("/api/auth/email/verify/resend/", {"email": "not-an-email"}, format="json").status_code, 400)


class BrevoBackendTests(TestCase):
    """Sending goes to Brevo's API; urlopen is mocked so nothing leaves the machine."""

    def backend(self):
        from .brevo import BrevoEmailBackend
        return BrevoEmailBackend()

    @override_settings(BREVO_API_KEY="test-key", BREVO_API_URL="https://api.brevo.com/v3", DEFAULT_FROM_EMAIL="no-reply@ask231.com", EMAIL_FROM_NAME="Ask231")
    def test_sends_html_and_text_with_the_api_key_header(self):
        from django.core.mail import EmailMultiAlternatives
        message = EmailMultiAlternatives("Verify your Ask231 account", "plain body", None, ["amara@example.com"])
        message.attach_alternative("<p>html body</p>", "text/html")
        with mock.patch("urllib.request.urlopen") as urlopen:
            urlopen.return_value.__enter__.return_value.read.return_value = b'{"messageId":"<1@brevo>"}'
            self.assertEqual(self.backend().send_messages([message]), 1)
        request = urlopen.call_args.args[0]
        self.assertEqual(request.full_url, "https://api.brevo.com/v3/smtp/email")
        self.assertEqual(request.get_header("Api-key"), "test-key")
        body = json.loads(request.data)
        self.assertEqual(body["sender"], {"email": "no-reply@ask231.com", "name": "Ask231"})
        self.assertEqual(body["to"], [{"email": "amara@example.com"}])
        self.assertEqual(body["subject"], "Verify your Ask231 account")
        self.assertEqual(body["htmlContent"], "<p>html body</p>")
        self.assertEqual(body["textContent"], "plain body")

    @override_settings(BREVO_API_KEY="test-key", DEFAULT_FROM_EMAIL="no-reply@ask231.com")
    def test_plain_text_emails_get_an_html_copy(self):
        from django.core.mail import EmailMessage
        with mock.patch("urllib.request.urlopen") as urlopen:
            self.backend().send_messages([EmailMessage("Reset your password", "Use https://ask231.com/x <now>", None, ["a@example.com"])])
        body = json.loads(urlopen.call_args.args[0].data)
        self.assertIn('href="https://ask231.com/x"', body["htmlContent"])
        self.assertIn("&lt;now&gt;", body["htmlContent"])

    @override_settings(BREVO_API_KEY="secret-key-123", DEFAULT_FROM_EMAIL="no-reply@ask231.com")
    def test_errors_are_raised_and_logged_without_the_key(self):
        import io
        import urllib.error
        from django.core.mail import EmailMessage
        from .brevo import BrevoError
        error = urllib.error.HTTPError("https://api.brevo.com/v3/smtp/email", 401, "Unauthorized", {}, io.BytesIO(b'{"message":"Key not found"}'))
        with mock.patch("urllib.request.urlopen", side_effect=error), self.assertLogs("accounts.brevo", "ERROR") as logs:
            with self.assertRaisesMessage(BrevoError, "Key not found"):
                self.backend().send_messages([EmailMessage("s", "b", None, ["amara@example.com"])])
        self.assertNotIn("secret-key-123", "".join(logs.output))
        self.assertNotIn("amara@example.com", "".join(logs.output))  # addresses are masked

    @override_settings(BREVO_API_KEY="")
    def test_missing_key_is_reported_clearly(self):
        from django.core.exceptions import ImproperlyConfigured
        with self.assertRaises(ImproperlyConfigured):
            self.backend()
