# ALEXZA AI – Postman Collection

Use the Postman collection to call ALEXZA APIs instantly.

## Quick Start

### 1. Import collection and environment

1. Open Postman.
2. **Import collection**: File → Import → select `postman/ALEXZA.postman_collection.json`.
3. **Import environment**: File → Import → select `postman/ALEXZA.postman_environment.json`.
4. Select the **ALEXZA Local** environment in the top-right dropdown.

### 2. Set baseUrl and apiKey

1. Click the environment icon (eye) → **ALEXZA Local** → Edit.
2. Set:
   - **baseUrl**: `http://localhost:3005` (or your server URL).
   - **apiKey**: Your API key (e.g. `axza_live_...`). Get it from a project’s API Keys page.
3. Save.

### 3. Run requests

1. **API key endpoints** (e.g. Run action): Use `x-api-key` from the environment.  
   The collection uses `{{apiKey}}` for Run requests.
2. **Session endpoints** (e.g. Projects, Webhooks): Run **Auth → Login** first.  
   Postman will store the session cookie.

## Environment Variables

| Variable   | Description                          | Example                    |
|-----------|--------------------------------------|----------------------------|
| baseUrl   | API base URL                         | `http://localhost:3005`    |
| apiKey    | API key for Run endpoints            | `axza_live_...`            |
| projectId | Project ID (for Run, Actions)         | MongoDB ObjectId            |
| actionName| Action name (for Run)                | `summarize_text`           |
| webhookUrl| Webhook URL (for Create Webhook)     | `https://example.com/webhook` |
| fromDate  | From date (for Requests, Audit)      | `2025-01-01`               |
| toDate    | To date (for Requests, Audit)       | `2025-01-31`               |

## Collections Overview

| Folder | Auth | Description |
|--------|------|-------------|
| Auth | None | Login, Signup |
| Runtime | x-api-key | Run action, Legacy run |
| Projects | Session | List, Create, Get |
| Actions | Session | List, Create/Update, Get, Delete |
| Analytics | Session | Overview, Projects, Actions, Daily |
| Requests | Session | List, Get detail |
| Webhooks | Session | List, Create, Update, Delete |
| Audit | Session | List audit logs |

## Regenerating the Collection

The collection is generated from `openapi.yaml`:

```bash
pnpm run postman:generate
```

This updates `postman/ALEXZA.postman_collection.json`. The environment file is not changed.

## Troubleshooting

### 401 Unauthorized on Run

- Ensure **apiKey** is set in the environment.
- Use the same API key shown in the project’s API Keys page.
- Check that the key is not revoked.

### 401 on Projects / Webhooks / Analytics

- Use **session auth** (cookie). Run **Auth → Login** first.
- Set cookies in Postman: Settings → General → Cookies → Manage Cookies.
- Or use the same domain as the app (e.g. `localhost:3005`) so cookies are sent.

### CORS errors

- If calling from a different origin, ensure the server has CORS configured for your domain.
- For local dev, `http://localhost:3005` is usually allowed.

### baseUrl not applied

- Confirm the **ALEXZA Local** environment is selected.
- Edit the environment and ensure values are saved.

### Collection out of date

Run `pnpm run postman:generate` to regenerate from `openapi.yaml`.  
CI runs `pnpm run postman:check` to verify the collection can be generated and has the expected structure.
