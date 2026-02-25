# Stripe Wallet Top-up — End-to-End Audit Report

## 1) ENV VARIABLE VALIDATION

| Variable | Location | Usage | Status |
|----------|----------|-------|--------|
| **STRIPE_SECRET_KEY** | `server/modules/stripe/stripe.client.ts` | Server only, `sk_test_*` or `sk_live_*` | ✅ Correct |
| **STRIPE_WEBHOOK_SECRET** | `server/modules/stripe/stripe.webhook.ts` | Server only, `whsec_*` | ✅ Correct |
| **APP_URL** | `server/modules/stripe/stripe.checkout.ts` | Fallback: `CLIENT_URL`. Public client base URL for redirects (NOT webhook) | ✅ Correct |
| **CREDIT_PRICE** | `server/wallet.ts`, `client/config/pricing.ts` | Hardcoded `0.003` — no env, consistent | ✅ Correct |
| **VITE_STRIPE_PUBLISHABLE_KEY** | — | Not used (Stripe Checkout redirect, not Elements) | ✅ Not required |

**Env snippets:**

```env
# .env.local (local dev)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."   # from: stripe listen --forward-to localhost:3002/api/billing/stripe/webhook
APP_URL="http://localhost:5173"     # Vite client URL

# Production (Render)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."   # from Stripe Dashboard → Webhooks → endpoint signing secret
APP_URL="https://alexza-platform8.onrenderer.com"
# or CLIENT_URL="https://alexza-platform8.onrenderer.com" (APP_URL falls back to CLIENT_URL)
```

---

## 2) BACKEND STRIPE CONFIG CHECK

| Check | Status | Notes |
|-------|--------|-------|
| Stripe client uses STRIPE_SECRET_KEY | ✅ | `stripe.client.ts` — lazy init, throws if missing |
| MIN/MAX topup enforced | ✅ | `stripe.service.ts`: MIN=10, MAX=500 USD |
| usdToCredits uses CREDIT_PRICE | ✅ | `stripe.service.ts` imports from `wallet.ts` |
| CREDIT_PRICE consistent | ✅ | `wallet.ts` (0.003), `stripe.checkout` uses same |
| APP_URL fallback to CLIENT_URL | ✅ | `stripe.checkout.ts` line 10 |

---

## 3) WEBHOOK RAW BODY + ROUTING

| Check | Status | Notes |
|-------|--------|-------|
| Webhook mounted BEFORE express.json() | ✅ | `server/index.ts` line 147–148 |
| Uses express.raw({ type: "application/json" }) | ✅ | `stripe.routes.ts` createWebhookRoute() |
| Signature verification with stripe-signature + STRIPE_WEBHOOK_SECRET | ✅ | `stripe.webhook.ts` lines 63–79 |
| Handles checkout.session.completed | ✅ | `stripe.webhook.ts` line 90 |
| Safely parses metadata, adds credits | ✅ | userId from metadata, ObjectId validation |
| Returns 2xx on success | ✅ | 200 on success, 400 on bad sig, 500 on processing error |

---

## 4) IDEMPOTENCY + DB

| Check | Status | Notes |
|-------|--------|-------|
| stripe_events collection with unique index on sessionId | ✅ | `stripe.webhook.ts` ensureStripeEventsCollection() |
| Replays don't double-add | ✅ | tryMarkSessionProcessed → insertOne, duplicate key 11000 = skip |
| Wallet transaction includes amountUsd, currency, provider | ✅ | `stripe.service.ts` addCreditsToWallet → meta |

---

## 5) FRONTEND FLOW

| Check | Status | Notes |
|-------|--------|-------|
| Amount validation 10–500 | ✅ | `Wallet.tsx` MIN_STRIPE_USD=10, MAX_STRIPE_USD=500 |
| Proceed to Checkout → POST /api/billing/stripe/checkout → redirect to url | ✅ | `createStripeCheckoutSession`, `window.location.href = res.url` |
| status=success / status=cancel handling | ✅ | useEffect reads params, invalidateWallet(), replaceState |
| Frontend does NOT use STRIPE_SECRET_KEY | ✅ | API only |
| VITE_STRIPE_PUBLISHABLE_KEY not required | ✅ | Not used (Checkout redirect flow) |

---

## 6) PRODUCTION READINESS (Render + Stripe Dashboard)

| Check | Status | Notes |
|-------|--------|-------|
| Webhook URL format | ✅ | `https://alexza-platform8.onrenderer.com/api/billing/stripe/webhook` |
| Local: Stripe CLI listen, whsec_ from CLI | ✅ | `stripe listen --forward-to localhost:3002/api/billing/stripe/webhook` |
| Production: whsec_ from Dashboard | ✅ | Stripe Dashboard → Webhooks → Add endpoint → Signing secret |

**Render backend env (required):**
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
APP_URL  (or CLIENT_URL)
MONGODB_URI
SESSION_SECRET
... (other existing vars)
```

**Frontend env:** None required for Stripe (no VITE_STRIPE_*).

---

## FIXES APPLIED

1. **server/modules/stripe/stripe.webhook.ts** — Handle missing STRIPE_WEBHOOK_SECRET at start; return 500 JSON instead of unhandled throw. Remove redundant getWebhookSecret().
2. **.env.example** — Add production APP_URL comment.

---

## Verdict: ✅ Ready to ship

All checks pass. Apply the minor fixes above for robustness.
