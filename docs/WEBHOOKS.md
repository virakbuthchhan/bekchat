# Bek-Chat Webhooks & Bot API Guide

Bek-Chat provides a robust webhook infrastructure enabling seamless integration with external tools (GitHub, GitLab, Sentry, CI/CD pipelines, custom alert systems) and Telegram-compatible bot agents.

---

## 📥 1. Incoming Webhooks (Slack-Compatible)

Incoming webhooks allow external services to post messages into any Bek-Chat channel using standard Slack JSON payloads.

### Webhook Endpoint URL
`POST http://localhost:3000/api/webhooks/incoming/{webhook_token}`

### Payload Specification
```json
{
  "text": "🚀 *Deploy Completed*: Version `v1.4.0` is now live in production!",
  "username": "GitHub Actions Bot",
  "icon_url": "https://github.githubassets.com/favicons/favicon.png",
  "attachments": [
    {
      "title": "Commit Details",
      "text": "Merged PR #42: Add real-time typing indicators and HMAC webhook signatures."
    }
  ]
}
```

### Example cURL Request
```bash
curl -X POST http://localhost:3000/api/webhooks/incoming/whi_9f8e7d6c5b4a3f2e1d \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Sentry Alert: Unhandled exception in payments service",
    "username": "Sentry Bot",
    "icon_url": "https://sentry.io/favicon.ico"
  }'
```

---

## 📤 2. Outgoing Webhooks (Event Dispatcher)

Outgoing webhooks trigger HTTP `POST` requests to your registered URL whenever specified events occur in your workspace.

### Headers Sent by Bek-Chat
- `Content-Type: application/json`
- `X-Signature: <hex_encoded_hmac_sha256_signature>`
- `X-BekChat-Event: message.created`
- `User-Agent: BekChat-WebhookDispatcher/1.0`

### Event Payload Example (`message.created`)
```json
{
  "event": "message.created",
  "channelId": "ch_12345",
  "message": {
    "id": "msg_98765",
    "content": "Hello team!",
    "sender": {
      "username": "alex"
    },
    "createdAt": "2026-07-26T15:00:00.000Z"
  }
}
```

---

### 🔒 Signature Verification Code Examples

Receivers should calculate the HMAC-SHA256 digest of the raw incoming request body using the webhook `secret` and compare it against the `X-Signature` header.

#### Node.js (Express / Fastify) Example:
```javascript
const crypto = require('crypto');

function verifyBekChatSignature(req, secret) {
  const signatureHeader = req.headers['x-signature'];
  const rawBody = JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expectedSignature)
  );
}
```

#### Python (Flask / FastAPI) Example:
```python
import hmac
import hashlib

def verify_signature(raw_body_bytes: bytes, secret_str: str, signature_header: str) -> bool:
    secret_bytes = secret_str.encode('utf-8')
    expected_sig = hmac.new(secret_bytes, raw_body_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_sig, signature_header)
```

---

## 🤖 3. Telegram-Style Bot API

Bek-Chat offers a Telegram-compatible API for lightweight bot integration.

### Send Message Endpoint
`POST http://localhost:3000/api/bot/sendMessage`
Header: `X-Bot-Token: bek_xxxxxxxx...` or `Authorization: Bearer bek_xxxxxxxx...`

#### Payload:
```json
{
  "channel_id": "ch_12345",
  "text": "Automated status report: All systems operational ✅",
  "formatting": "markdown"
}
```

### Long-Polling Updates Endpoint
`GET http://localhost:3000/api/bot/getUpdates?offset=0&limit=50`
Header: `X-Bot-Token: bek_xxxxxxxx...`

#### Response:
```json
{
  "ok": true,
  "result": [
    {
      "update_id": 101,
      "message": {
        "message_id": "msg_98765",
        "chat": { "id": "ch_12345", "name": "general" },
        "text": "Hello bot!",
        "date": "2026-07-26T15:00:00.000Z"
      }
    }
  ]
}
```
