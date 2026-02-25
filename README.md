# Alexza AI

## Local API health checks

After starting the server, test these endpoints in your browser:

- `/api/health`
- `/api/health/db`
- `/api/health/openai`
Expected DB response when Mongo is connected:

```json
{ "ok": true, "db": "connected" }
```

## Run

```bash
# Starts both backend (http://localhost:3002) and frontend (Vite)
pnpm dev
pnpm build
pnpm start
```

Set these env values in `.env.local`:

```bash
# Auth (required for signup/login)
SESSION_SECRET="your_session_secret"

# MongoDB
MONGODB_URI="mongodb://..."
MONGODB_DB="alexza"

# Builder AI (Chat Builder)
OPENAI_API_KEY="..."
BUILDER_MODEL="gpt-4o-mini"

# Execution Gateway (ALEXZA Managed Runtime)
OPENROUTER_API_KEY="..."
OPENROUTER_BASE_URL="..."  # optional
EXECUTION_DEFAULT_MODEL="..."  # optional

# Legacy /v1/run
OPENAI_MODEL="gpt-4o-mini"
```

### Ports (development)

- Backend API is forced to run on `http://localhost:3002` via `dev:server` script.
- Frontend (Vite dev server) runs on `http://localhost:3000` by default and may move to another port if busy.
- Frontend API base uses `VITE_API_BASE_URL` and falls back to same-origin when not set.

## Dev Smoke Test (Connection Refused Guard)

Run `pnpm dev`, then verify backend is reachable:

```bash
curl -i http://localhost:3002/api/health
```

Expected response:

```json
{"ok":true}
```

If this endpoint fails, auth/signup/login/projects will fail with `ERR_CONNECTION_REFUSED` too.

## Auth Smoke Test

Set `SESSION_SECRET` in `.env.local` before testing auth endpoints.

```bash
# 1) Signup
curl -i -c cookies.txt -X POST http://localhost:3002/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123","name":"Demo User"}'

# 2) Login
curl -i -c cookies.txt -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}'

# 3) Me
curl -i -b cookies.txt http://localhost:3002/api/me

# 4) Logout
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3002/api/auth/logout
```

## OAuth (Google, GitHub)

Sign-in with Google or GitHub is available on the Login and Signup pages. See **[docs/AUTH_OAUTH.md](docs/AUTH_OAUTH.md)** for full setup.

**Quick config:** Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `OAUTH_REDIRECT_BASE_URL`, `FRONTEND_APP_URL`, and `SESSION_SECRET`.

**Local dev:** Vite proxies `/auth` to the backend. Use `OAUTH_REDIRECT_BASE_URL=http://localhost:3000` and `FRONTEND_APP_URL=http://localhost:3000` so callbacks hit the same origin and cookies work.

**Redirect URIs** (must match provider console):

| Environment | Callback URL |
|-------------|--------------|
| Dev | `http://localhost:3000/auth/google/callback` and `http://localhost:3000/auth/github/callback` |
| Prod | `https://alexza-platform8.onrender.com/auth/google/callback` and `https://alexza-platform8.onrender.com/auth/github/callback` |

## Projects Smoke Test

Use the same cookie session from auth (`cookies.txt`).

```bash
# 1) Create project
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3002/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"My First Project","description":"From curl","model":"GPT-4"}'

# 2) List current user's projects
curl -i -b cookies.txt http://localhost:3002/api/projects

# 3) Get one project by id
curl -i -b cookies.txt http://localhost:3002/api/projects/<project_id>
```

## Builder AI (Threads, Messages, Actions)

Use an authenticated cookie session (`cookies.txt`) and a project id:

```bash
# 1) Create thread
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3002/api/projects/<project_id>/threads \
  -H "Content-Type: application/json" \
  -d '{"title":"New chat"}'

# 2) List threads
curl -i -b cookies.txt http://localhost:3002/api/projects/<project_id>/threads

# 3) List messages
curl -i -b cookies.txt http://localhost:3002/api/threads/<thread_id>/messages

# 4) Send message (creates user msg, calls Builder AI, returns assistant + proposedActions)
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3002/api/threads/<thread_id>/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"อยากได้ API สรุปข้อความ"}'

# 5) Apply action (upsert)
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3002/api/projects/<project_id>/actions \
  -H "Content-Type: application/json" \
  -d '{"actionName":"summarize_text","description":"...","inputSchema":{"type":"object","properties":{"input":{"type":"string"}},"required":["input"]}}'

# 6) List actions
curl -i -b cookies.txt http://localhost:3002/api/projects/<project_id>/actions

# 7) Delete action
curl -i -b cookies.txt -X DELETE http://localhost:3002/api/projects/<project_id>/actions/<action_name>
```

- `actionName` must be URL-safe (a-z, 0-9, underscore, hyphen).
- `inputSchema` must be valid JSON schema.
- Responses never include provider/model/gateway info.

## API Keys Smoke Test

Use a valid project id from the projects API.

```bash
# 1) Create key (rawKey is returned only once)
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3002/api/projects/<project_id>/keys \
  -H "Content-Type: application/json" \
  -d '{"name":"Production Key"}'

# 2) List keys (rawKey is NOT returned)
curl -i -b cookies.txt http://localhost:3002/api/projects/<project_id>/keys

# 3) Revoke key
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3002/api/projects/<project_id>/keys/<key_id>/revoke
```

After refresh, raw key cannot be retrieved again from list endpoints.

## Run Endpoint Smoke Tests

### Recommended: Run by Action (`/v1/projects/:projectId/run/:actionName`)

1. Create a project and API key (see Projects + API Keys smoke tests).
2. Use Chat Builder in the app to define an action (or create one via `POST /api/projects/<project_id>/actions`).
3. Run the action:

```bash
curl -i -X POST "http://localhost:3002/v1/projects/<project_id>/run/<action_name>" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <raw_api_key>" \
  -d '{"input":"Hello from curl"}'
```

Expected success response shape:

```json
{ "ok": true, "requestId": "...", "output": "...", "usage": { "tokens": 0, "creditsCharged": 1 }, "latencyMs": 100 }
```

Smoke test (creates user, project, key, action, then runs):

```bash
pnpm tsx scripts/smoke-run-by-action.ts
```

### Legacy: Single Run (`/v1/run`) — Deprecated

Use the raw API key returned from `POST /api/projects/<project_id>/keys`.

```bash
# 1) Health check for OpenAI config
curl -i http://localhost:3002/api/health/openai

# 2) Run with API key in x-api-key
curl -i -X POST http://localhost:3002/v1/run \
  -H "Content-Type: application/json" \
  -H "x-api-key: <raw_api_key>" \
  -d '{"input":"Hello from curl"}'
```

Expected success response shape:

```json
{ "ok": true, "output": "...", "model": "gpt-4o-mini", "usage": {} }
```

## Usage Analytics Smoke Test

This verifies that usage analytics reads from real `usage_logs`.

Use an authenticated cookie session (`cookies.txt`) and a project id:

```bash
# 1) Signup + login (or reuse an existing cookie)
curl -i -c cookies.txt -X POST http://localhost:3002/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"usage-demo@example.com","password":"password123","name":"Usage Demo"}'

curl -i -c cookies.txt -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usage-demo@example.com","password":"password123"}'

# 2) Create project
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3002/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Usage Project","description":"usage smoke","model":"GPT-4"}'

# 3) Create API key for that project
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3002/api/projects/<project_id>/keys \
  -H "Content-Type: application/json" \
  -d '{"name":"Usage Smoke Key"}'

# 4) Call /v1/run at least 3 times using x-api-key
curl -i -X POST http://localhost:3002/v1/run \
  -H "Content-Type: application/json" \
  -H "x-api-key: <raw_api_key>" \
  -d '{"input":"hello 1"}'
curl -i -X POST http://localhost:3002/v1/run \
  -H "Content-Type: application/json" \
  -H "x-api-key: <raw_api_key>" \
  -d '{"input":"hello 2"}'
curl -i -X POST http://localhost:3002/v1/run \
  -H "Content-Type: application/json" \
  -H "x-api-key: <raw_api_key>" \
  -d '{"input":"hello 3"}'

# 5) Global usage summary
curl -i -b cookies.txt http://localhost:3002/api/usage/summary?days=7

# 6) Project usage summary
curl -i -b cookies.txt http://localhost:3002/api/projects/<project_id>/usage/summary?days=7
```

## Monitoring (Sentry + Logging)

### Sentry

Set these in `.env.local` (backend) and ensure `VITE_*` vars are set at build time (frontend):

- `SENTRY_DSN` — Backend DSN from [sentry.io](https://sentry.io)
- `SENTRY_ENVIRONMENT` — Defaults to `NODE_ENV`
- `SENTRY_TRACES_SAMPLE_RATE` — Default `0.1`
- `SENTRY_PROFILES_SAMPLE_RATE` — Default `0`
- `VITE_SENTRY_DSN` — Frontend DSN (build-time)
- `VITE_SENTRY_ENVIRONMENT` — Frontend environment (build-time)

With DSNs empty, the app runs normally; Sentry is disabled.

### Slow request tracking

- `SLOW_REQUEST_MS` — Default `2000`. Requests exceeding this (on `/api/*` and `/v1/*`) trigger a warn log and Sentry breadcrumb.

### Recommended Sentry alert rules

- Error rate spike (e.g. >5% in 5 min)
- New issue created
- Slow requests (filter by `slow_request=true` tag)

## Wallet (Prepaid Credits)

- 1 credit = 1,000 tokens. $0.003 per credit.
- New users receive 500 free credits on signup (one-time).
- API stops when balance reaches zero (HTTP 402).
- No subscription; prepaid wallet only.

### Backfill existing users

Run once after deploying the wallet backend to set default fields for users created before the migration:

```bash
pnpm tsx server/scripts/backfillWallet.ts
```

This sets `walletBalanceCredits=0` and `walletGrantedFreeCredits=true` for users missing these fields. It does **not** grant 500 credits retroactively.

### Admin manual top-up

For testing or support, use `POST /api/wallet/topup/manual` with `x-admin-key` header:

```bash
curl -X POST https://your-app.onrender.com/api/wallet/topup/manual \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{"userId":"USER_OBJECT_ID","credits":1000,"reason":"Support top-up"}'
```

Set `ADMIN_API_KEY` in your environment. In production, this is required for admin endpoints.

## Deploy to Render

This project is set up for a single Render Web Service that builds client + server and runs the server in production.

### Build and start commands

Use these in Render:

- Build command: `pnpm install && pnpm build`
- Start command: `pnpm start`

### Required environment variables (Render)

Backend/runtime:

- `NODE_ENV=production`
- `PORT` (Render injects this automatically)
- `MONGODB_URI`
- `MONGODB_DB`
- `SESSION_SECRET`
- `SESSION_COOKIE_NAME` (optional, defaults to `alexza_session`)
- `OPENAI_API_KEY` (Builder AI + legacy `/v1/run`)
- `OPENROUTER_API_KEY` (ALEXZA Managed Runtime)
- `OPENROUTER_BASE_URL` (optional)
- `BUILDER_MODEL` (optional)
- `EXECUTION_DEFAULT_MODEL` (optional)

Frontend build-time:

- `VITE_API_BASE_URL` (optional when serving frontend + backend from same domain; can be left empty)
- `VITE_ANALYTICS_ENDPOINT` (optional)
- `VITE_ANALYTICS_WEBSITE_ID` (optional)
- `VITE_SENTRY_DSN` (optional, for frontend error monitoring)
- `VITE_SENTRY_ENVIRONMENT` (optional, defaults to build mode)

Monitoring (optional):

- `SENTRY_DSN` (backend error monitoring)
- `SENTRY_ENVIRONMENT` (defaults to `NODE_ENV`)
- `SLOW_REQUEST_MS` (default 2000, ms threshold for slow request logging)

Networking/cookies (required for production auth):

- `CLIENT_URL` (recommended) — frontend origin, e.g. `https://your-app.onrender.com` (enables cross-origin cookies)
- `CORS_ORIGIN` (alternative) — comma-separated allowlist, e.g. `https://your-app.onrender.com`
- `TRUST_PROXY=1` (recommended on Render so secure cookies work behind proxy)

### Deployment checklist

1. Set all required ENV values in Render.
2. Deploy with `pnpm build` and `pnpm start`.
3. Open `https://<your-render-domain>/api/health` and verify:

```json
{"ok":true}
```

4. Test signup/login flow to confirm cookies and CORS are correct on your real domain.

## Production smoke test

Run the automated production smoke test against Render:

```bash
pnpm tsx scripts/smoke-prod.ts
```

Optional overrides:

```bash
PROD_BASE_URL="https://alexza-platform8.onrender.com" pnpm tsx scripts/smoke-prod.ts
PROD_SMOKE_PASSWORD="your_password" pnpm tsx scripts/smoke-prod.ts
```
