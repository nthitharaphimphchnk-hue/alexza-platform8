# ALEXZA AI Webhooks

Receive real-time events from ALEXZA AI via HTTP POST callbacks.

## Overview

- **Endpoint setup**: Create webhook endpoints in [Settings → Webhooks](/app/webhooks) or [/app/webhooks](/app/webhooks).
- **Events**: Select which event types to receive.
- **Secret**: Each endpoint gets a unique secret for signature verification. **Save it when created — it is shown only once.**

## Event Types

| Event | Description |
|-------|-------------|
| `auth.user.created` | New user signed up |
| `wallet.topup.succeeded` | Credits added via Stripe payment |
| `wallet.low_balance` | Low credits email was sent (balance below threshold) |
| `action.run.succeeded` | Action run completed successfully |
| `action.run.failed` | Action run failed (provider error, etc.) |

## Payload Examples

### auth.user.created

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "Jane Doe"
}
```

### wallet.topup.succeeded

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "amountUsd": 10,
  "creditsAdded": 3333,
  "balanceCredits": 5000,
  "requestId": "cs_xxx"
}
```

### wallet.low_balance

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "balanceCredits": 85,
  "threshold": 100
}
```

### action.run.succeeded

```json
{
  "requestId": "uuid-xxx",
  "projectId": "507f1f77bcf86cd799439011",
  "actionName": "summarize",
  "creditsCharged": 12,
  "latencyMs": 1200,
  "output": "Summary text..."
}
```

### action.run.failed

```json
{
  "requestId": "uuid-xxx",
  "projectId": "507f1f77bcf86cd799439011",
  "actionName": "summarize",
  "statusCode": 502,
  "latencyMs": 5000,
  "error": { "message": "Request failed" }
}
```

## HTTP Request Format

Each webhook delivery is sent as:

- **Method**: `POST`
- **Content-Type**: `application/json`
- **Headers**:
  - `X-Alexza-Event`: Event type (e.g. `auth.user.created`)
  - `X-Alexza-Timestamp`: Unix timestamp in milliseconds
  - `X-Alexza-Signature`: HMAC-SHA256 signature (see below)

## Signature Verification

The signature is computed as:

```
HMAC-SHA256(secret, timestamp + "." + rawBody)
```

The header value is: `sha256=<hex>`

### Node.js Example

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(secret, signature, timestamp, rawBody) {
  const payload = `${timestamp}.${rawBody}`;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expected, 'utf8')
  );
}

// In your Express handler:
app.post('/webhooks/alexza', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-alexza-signature'];
  const timestamp = req.headers['x-alexza-timestamp'];
  const rawBody = req.body.toString('utf8');

  if (!verifyWebhookSignature(YOUR_SECRET, signature, timestamp, rawBody)) {
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(rawBody);
  // Process payload...
  res.status(200).send('OK');
});
```

**Important**: Use the raw request body for verification. Do not parse JSON first and re-stringify.

## Response Requirements

- **Return 2xx quickly** (within 10 seconds). ALEXZA treats non-2xx as failure and will retry.
- **Idempotency**: Your handler may receive the same event more than once during retries. Design for idempotency (e.g. use `requestId` or event IDs).

## Retry Policy

- **Retries**: 3 attempts with exponential backoff (1m, 5m, 30m).
- **Timeout**: 10 seconds per request.
- **Success**: HTTP status 200–299.

## Project Scope (MVP)

- Endpoints are **user-level** (`projectId` is null). Project-scoped webhooks may be added later.
- Delivery logs are stored; you can view recent deliveries per endpoint in the UI.
