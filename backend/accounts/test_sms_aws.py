from unittest import mock

from botocore.exceptions import ClientError, NoCredentialsError
from django.test import SimpleTestCase, override_settings

from . import sms


@override_settings(SMS_BACKEND="aws", SMS_AWS_REGION="us-east-1", SMS_FROM="")
class AwsSmsBackendTests(SimpleTestCase):
    """The "aws" SMS backend calls AWS End User Messaging SMS (pinpoint-sms-voice-v2) SendTextMessage."""

    def setUp(self):
        sms._aws_client = None
        self.client_mock = mock.Mock()
        patcher = mock.patch("boto3.client", return_value=self.client_mock)
        self.boto_client = patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(setattr, sms, "_aws_client", None)

    def test_sends_a_transactional_text_in_the_configured_region(self):
        sms.send_sms("+231770123456", "123456 is your code")
        self.boto_client.assert_called_once_with("pinpoint-sms-voice-v2", region_name="us-east-1")
        self.client_mock.send_text_message.assert_called_once_with(DestinationPhoneNumber="+231770123456", MessageBody="123456 is your code", MessageType="TRANSACTIONAL")

    @override_settings(SMS_FROM="ask231")
    def test_uses_the_sender_id_when_set(self):
        sms.send_sms("+231770123456", "hi")
        self.assertEqual(self.client_mock.send_text_message.call_args.kwargs["OriginationIdentity"], "ask231")

    def test_reuses_one_client(self):
        sms.send_sms("+231770123456", "a")
        sms.send_sms("+231770123456", "b")
        self.assertEqual(self.boto_client.call_count, 1)

    def test_aws_errors_become_sms_errors(self):
        self.client_mock.send_text_message.side_effect = ClientError({"Error": {"Code": "ValidationException", "Message": "Destination not supported"}}, "SendTextMessage")
        with self.assertLogs("accounts.sms", "ERROR"), self.assertRaisesMessage(sms.SmsError, "Destination not supported"):
            sms.send_sms("+231770123456", "hi")

    def test_missing_credentials_become_sms_errors(self):
        self.client_mock.send_text_message.side_effect = NoCredentialsError()
        with self.assertLogs("accounts.sms", "ERROR"), self.assertRaises(sms.SmsError):
            sms.send_sms("+231770123456", "hi")
