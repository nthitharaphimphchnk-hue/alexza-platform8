# Monthly Reset Cron Runbook

This runbook configures and verifies automatic monthly billing resets in production.

## Prerequisites

- Render service is deployed and healthy.
- `ADMIN_API_KEY` is set in Render environment variables.
- Admin endpoints are mounted:
  - `POST /api/admin/billing/cron/reset-monthly`
  - `POST /api/admin/billing/reset-monthly`
  - `POST /api/admin/billing/force-reset-due`

## Cron-job.org Setup (Production)

1. Open cron-job.org and create a new job.
2. Configure URL:
   - `https://alexza-platform8.onrender.com/api/admin/billing/cron/reset-monthly`
3. Set HTTP method:
   - `POST`
4. Add request header:
   - Key: `x-admin-key`
   - Value: `<your ADMIN_API_KEY value>`
5. Schedule:
   - Monthly
   - Day: `1`
   - Time: `00:05`
   - Timezone: `Asia/Bangkok`
6. Save and enable the job.

## Immediate Test Commands

### PowerShell (Windows)

```powershell
Invoke-WebRequest -Uri "https://alexza-platform8.onrender.com/api/_debug/routes" `
  -Headers @{ "x-admin-key" = "alexza_super_admin_2024_secure_key" } | Select-Object -ExpandProperty Content

Invoke-RestMethod -Method POST `
  -Uri "https://alexza-platform8.onrender.com/api/admin/billing/cron/reset-monthly" `
  -Headers @{ "x-admin-key" = "alexza_super_admin_2024_secure_key" } | ConvertTo-Json -Compress
```

Expected shape:

```json
{"ok":true,"resetCount":0,"ranAt":"2026-02-19T00:05:00.000Z"}
```

### curl.exe (Windows-friendly)

```powershell
curl.exe -s -H "x-admin-key: alexza_super_admin_2024_secure_key" "https://alexza-platform8.onrender.com/api/_debug/routes"

curl.exe -s -X POST -H "x-admin-key: alexza_super_admin_2024_secure_key" "https://alexza-platform8.onrender.com/api/admin/billing/cron/reset-monthly"
```

## Verification in App UI

1. Go to Billing Plans page.
2. Refresh page after cron/manual run.
3. Confirm monthly usage (`monthlyCreditsUsed`) is reset to zero for due users.
4. Go to Wallet transaction history:
   - Confirm `monthly_reset_bonus` transactions exist for affected users.

## Troubleshooting

- `403 FORBIDDEN`:
  - Missing `x-admin-key` header, wrong key, or `ADMIN_API_KEY` not set in Render.
- `404 NOT_FOUND`:
  - Route not deployed yet; check Render deploy status and `_debug/routes`.
- `5xx INTERNAL_ERROR`:
  - Check Render logs for stack traces and Mongo connectivity.
- Slow first response:
  - Render spin-down cold start can delay first cron/manual request.
