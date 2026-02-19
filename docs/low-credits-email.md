# Low Credits Email Notifications

This runbook explains how low-credit email notifications work and how to test them in Render production.

## Overview

- Provider: Resend
- Trigger condition: `walletBalanceCredits < LOW_CREDITS_THRESHOLD_EMAIL` and `> 0`
- Spam controls:
  - Sends once per low-credit episode (healthy -> low transition)
  - Never sends again within 24 hours
- Opt-out:
  - User can disable in Settings (`lowCreditsEmailSuppressed`)

## Required Render Environment Variables

- `RESEND_API_KEY`
- `EMAIL_FROM` (example: `ALEXZA <alerts@yourdomain.com>`)
- `LOW_CREDITS_THRESHOLD_EMAIL` (optional, default `100`)
- `BASE_URL` (optional, default `https://alexza-platform8.onrender.com`)
- `ADMIN_API_KEY` (required for admin endpoints in production)

After changing env vars, trigger a redeploy.

## Endpoints

- `POST /api/admin/notifications/test-low-credits`
  - Body: `{ "userId"?: string, "to"?: string }`
  - Uses authenticated session user if `userId` is omitted
- `POST /api/admin/notifications/cron/low-credits-scan`
  - Scans all users and sends eligible notifications
- `PATCH /api/me`
  - Body: `{ "lowCreditsEmailSuppressed": boolean }`

## Test Commands (PowerShell)

### 1) Check routes

```powershell
Invoke-WebRequest -Uri "https://alexza-platform8.onrender.com/api/_debug/routes" `
  -Headers @{ "x-admin-key" = "alexza_super_admin_2024_secure_key" } |
  Select-Object -ExpandProperty Content
```

### 2) Manual test send (known user)

```powershell
Invoke-RestMethod -Method POST `
  -Uri "https://alexza-platform8.onrender.com/api/admin/notifications/test-low-credits" `
  -Headers @{ "x-admin-key" = "alexza_super_admin_2024_secure_key" } `
  -ContentType "application/json" `
  -Body '{"userId":"PUT_USER_ID_HERE"}' | ConvertTo-Json -Compress
```

### 3) Cron scan test

```powershell
Invoke-RestMethod -Method POST `
  -Uri "https://alexza-platform8.onrender.com/api/admin/notifications/cron/low-credits-scan" `
  -Headers @{ "x-admin-key" = "alexza_super_admin_2024_secure_key" } | ConvertTo-Json -Compress
```

## Verify in UI

1. Go to `Settings -> Notifications`.
2. Toggle `Low credits email notifications`.
3. Save and confirm persistence after refresh.

## Troubleshooting

- `403 FORBIDDEN`:
  - Missing/wrong `x-admin-key` or `ADMIN_API_KEY` not set.
- `401/VALIDATION` on test endpoint:
  - Provide `userId` in request body if no session cookie is present.
- `500 Email provider is not configured`:
  - Missing `RESEND_API_KEY` or `EMAIL_FROM`.
- No emails sent in scan:
  - Users may be above threshold, suppressed, in same low-credit episode, or within cooldown window.
