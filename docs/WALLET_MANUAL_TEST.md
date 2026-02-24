# Wallet Manual Test Checklist

Use this checklist to verify the wallet backend works correctly.

## Prerequisites

- `pnpm dev` running
- MongoDB connected
- `.env.local` with `SESSION_SECRET`, `MONGODB_URI`, etc.

## 1. New user gets 500 credits once

1. Sign up a new user: `POST /api/auth/signup` with email, password, name
2. Log in: `POST /api/auth/login`
3. Check balance: `GET /api/wallet/balance` (with session cookie)
4. Expected: `balanceCredits: 500`
5. Log out and log in again
6. Check balance again
7. Expected: Still `balanceCredits: 500` (no double grant)

## 2. Runtime deducts credits

1. Create a project and API key
2. Note current balance
3. Call `POST /v1/projects/:projectId/run/:actionName` with valid input
4. Check balance again
5. Expected: Balance decreased by credits charged (based on tokens)

## 3. Insufficient balance returns 402

1. Set user balance to zero (via admin topup with negative credits, or use a new user and manually set balance in DB)
2. Call runtime endpoint
3. Expected: HTTP 402 with `error.code: "INSUFFICIENT_BALANCE"`, `requiredCredits`, `balanceCredits`

## 4. Transactions recorded

1. After any run (success or failure), check `GET /api/wallet/transactions`
2. Expected: `reserve` and/or `usage` and/or `refund` entries
3. After manual topup: `topup` entry
4. After signup: `grant` entry

## 5. Manual topup works with admin key

1. Set `ADMIN_API_KEY` in `.env.local`
2. Get a user's ObjectId (from `GET /api/me` or DB)
3. Call:
   ```bash
   curl -X POST http://localhost:3002/api/wallet/topup/manual \
     -H "Content-Type: application/json" \
     -H "x-admin-key: YOUR_ADMIN_API_KEY" \
     -d '{"userId":"USER_OBJECT_ID","credits":1000,"reason":"Test top-up"}'
   ```
4. Expected: `balanceCredits` increased by 1000

## 6. Provider failure refunds reservation

1. Simulate provider failure (e.g. invalid API key, network error)
2. Call runtime endpoint
3. Check balance: should be unchanged (reservation refunded)
4. Check transactions: `reserve` (negative) and `refund` (positive) entries

## 7. Backfill script

```bash
pnpm tsx server/scripts/backfillWallet.ts
```

Expected: Log output showing how many users were updated. No errors.
