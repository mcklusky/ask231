"""Alerts that bring members back to the site when someone messages them (email and SMS)."""
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction

from accounts.sms import send_sms

from .chat_serializers import public_name

logger = logging.getLogger(__name__)

PREVIEW_LENGTH = 200
SMS_TITLE_LENGTH = 40


def _preferences(user):
    profile = getattr(user, "profile", None)
    wants_email = profile is None or profile.email_on_new_message
    wants_sms = profile is None or profile.sms_on_new_message
    return (
        bool(wants_email and user.email and user.email_verified_at),
        bool(wants_sms and user.phone_number and user.phone_verified_at),
    )


def notify_new_message(message):
    """Alert the other participant about ``message``, at most once per unread batch.

    A member is alerted when a conversation goes from "all read" to "unread".
    Further messages in that conversation stay quiet until they open it again,
    so a quick back-and-forth never floods their inbox or phone.
    """
    conversation = message.conversation
    recipient = conversation.seller if message.sender_id == conversation.buyer_id else conversation.buyer
    if not recipient.is_active:
        return
    by_email, by_sms = _preferences(recipient)
    if not (by_email or by_sms):
        return
    earlier_unread = conversation.messages.filter(read_at__isnull=True).exclude(sender=recipient).exclude(pk=message.pk).exists()
    if earlier_unread:
        return

    sender_name = public_name(message.sender)
    title = conversation.subject_title
    link = f"{settings.FRONTEND_URL.rstrip('/')}/messages/{conversation.pk}"
    jobs = []

    if by_email:
        preview = message.body if len(message.body) <= PREVIEW_LENGTH else message.body[:PREVIEW_LENGTH].rstrip() + "…"
        subject = f"New message from {sender_name} about \"{title}\""
        body = (
            f"{sender_name} sent you a message on {settings.SITE_NAME} about \"{title}\":\n\n"
            f"{preview}\n\n"
            f"Read and reply: {link}\n\n"
            "Never send money before you have seen the item in person.\n\n"
            "You can turn off these emails on your account page."
        )
        jobs.append(("email", lambda: send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [recipient.email])))

    if by_sms:
        short_title = title if len(title) <= SMS_TITLE_LENGTH else title[:SMS_TITLE_LENGTH - 1].rstrip() + "…"
        text = f"{settings.SITE_NAME}: {sender_name[:30]} messaged you about \"{short_title}\". Reply: {link}"
        jobs.append(("sms", lambda: send_sms(recipient.phone_number, text)))

    def send():
        for kind, job in jobs:
            try:
                job()
            except Exception:  # an alert problem must never break sending the chat message
                logger.exception("Could not send new-message %s for message %s", kind, message.pk)

    transaction.on_commit(send)
