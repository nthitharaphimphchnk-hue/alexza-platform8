# ALEXZA AI – Production Launch Checklist

This checklist helps operators verify that ALEXZA AI is ready for a real production launch.  
You can run the automated readiness script and then walk through the manual checks below.

---

## 1. Pre-launch checklist

- **Environment & configuration**
  - [ ] Production base URL is final (e.g. `https://your-domain.com`)
  - [ ] Backend deployed with correct `.env` or Render environment settings
  - [ ] Frontend points at the correct API base URL
  - [ ] Timeouts and rate limits are configured for production traffic
- **Security**
  - [ ] `SESSION_SECRET` is long and random
  - [ ] Cookies are secure (HTTPS, `SameSite=None` when using cross-site frontends)
  - [ ] Admin API keys, if any, are stored securely
  - [ ] No debug routes or test accounts exposed publicly
- **Database & storage**
  - [ ] `MONGODB_URI` points at a production MongoDB cluster
  - [ ] MongoDB backups and monitoring are enabled
  - [ ] Connection limits and cluster size are appropriate for expected load
- **Monitoring & alerting**
  - [ ] Sentry is configured for backend and frontend
  - [ ] Uptime monitoring is enabled for the public API and app URLs
  - [ ] Basic alerts exist for error spikes and downtime

---

## 2. Required environment variables

These variables should be set in production before launch.

### Core

- `MONGODB_URI` – connection string for the production MongoDB cluster  
- `SESSION_SECRET` – session signing secret (long, random)
- `CLIENT_URL` or `FRONTEND_APP_URL` – frontend base URL
- `OAUTH_REDIRECT_BASE_URL` – base URL for OAuth callbacks

### AI providers

- At least **one** of:
  - `OPENAI_API_KEY`
  - `OPENROUTER_API_KEY`

### Stripe (wallet / marketplace billing)

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `APP_URL` or `CLIENT_URL` (used for Stripe redirect URLs)

### OAuth (Google / GitHub)

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `OAUTH_REDIRECT_BASE_URL`
- `CLIENT_URL` / `FRONTEND_APP_URL`

### Sentry monitoring

- `SENTRY_DSN` – backend DSN
- `VITE_SENTRY_DSN` – frontend DSN

### Rate limits (optional – defaults are safe)

- `RATE_LIMIT_IP_PER_MIN`
- `RATE_LIMIT_FREE_PER_MIN`
- `RATE_LIMIT_PRO_PER_MIN`
- `RATE_LIMIT_ENTERPRISE_PER_MIN`

### Timeout configuration

These values are in milliseconds; defaults are safe, but you should review them for your environment.

- `REQUEST_TIMEOUT_MS` – global HTTP request guard (default `30000`)
- `AI_RUN_TIMEOUT_MS` – upstream AI provider timeout (default `30000`)
- `WEBHOOK_TIMEOUT_MS` – outbound webhook timeout (default `10000`)
- `WORKFLOW_STEP_TIMEOUT_MS` – per-step workflow HTTP timeout (default `20000`)

---

## 3. Automated production readiness script

Run the automated script from the project root in the **production environment**:

```bash
PROD_BASE_URL="https://your-domain.com" pnpm exec tsx scripts/production-readiness.ts
```

The script will print a summary like:

```text
Environment: PASS
Health: PASS
Database: PASS
AI Providers: PASS
Auth & Projects: PASS
API Keys & Run: PASS
Core Routes: PASS
Frontend: PASS
Overall: READY
```

If any category shows **FAIL**, treat the platform as **NOT READY** until the underlying issues are resolved.  
If categories show **WARN**, review the detailed lines printed under the “Details” section.

---

## 4. Production smoke tests

After the environment passes the script checks, verify the main user flows manually:

### Authentication & onboarding

- [ ] Open `/login` and `/signup` – pages render without errors
- [ ] Create a new user account via email/password
- [ ] Log out and log back in with the same account
- [ ] (If configured) Log in via Google and GitHub OAuth

### Projects & API keys

- [ ] Create a new project in the UI
- [ ] View the project details page
- [ ] Create an API key for the project
- [ ] Copy the key and test a simple `POST /v1/run` request with `x-api-key`

### AI runtime

- [ ] In the Playground, select a project and action
- [ ] Run a simple request and confirm an answer is returned
- [ ] Confirm credits are deducted and visible in usage/billing views

### Webhooks

- [ ] Configure a test webhook endpoint
- [ ] Trigger an event (e.g. `action.run.succeeded`)
- [ ] Confirm delivery appears in **Webhook Deliveries**
- [ ] Verify retries occur for failing endpoints

### Billing & wallet

- [ ] (If Stripe configured) Start a top-up from the wallet UI
- [ ] Complete Stripe Checkout in test mode
- [ ] Confirm credits are added and ledger entries appear

### Marketplace & community

- [ ] Open `/app/marketplace`, `/app/agent-marketplace`, `/app/workflow-marketplace`
- [ ] Open `/app/community` and verify sections load (trending agents, workflows, creators, packs, apps)
- [ ] Install at least one template/agent/workflow into a project

### Docs & navigation

- [ ] Open `/docs` – documentation loads and sections are clickable
- [ ] Confirm links to guides, pricing, status, and SDK pages work

---

## 5. Rollback checklist

If something goes wrong after launch, follow this rollback plan:

- **Access & users**
  - [ ] Notify affected users (status page, email, or in-app banner)
  - [ ] Disable new signups if needed (feature flag or config)
- **Deployment**
  - [ ] Revert to the previous stable deployment (container image or Render deploy)
  - [ ] Confirm rollback version passes health checks
- **Data**
  - [ ] Verify MongoDB is healthy and no migrations are partially applied
  - [ ] If a migration caused issues, run the documented rollback for that migration (if available)
- **Verification**
  - [ ] Re-run the readiness script against the rolled-back version
  - [ ] Re-run key smoke tests (login, projects, run, billing)

---

## 6. Post-launch monitoring checklist

In the first hours and days after launch:

- **Errors & performance**
  - [ ] Monitor Sentry for new errors and error spikes
  - [ ] Watch for slow requests reported via Sentry and logs
  - [ ] Check CPU/memory usage and database performance
- **Traffic & usage**
  - [ ] Monitor request volume and rate limit behaviour
  - [ ] Confirm credits/usage dashboards reflect real traffic
- **Billing & payments**
  - [ ] Review Stripe Dashboard for successful and failed payments
  - [ ] Verify Stripe webhooks are being delivered without errors
- **User feedback**
  - [ ] Collect early user feedback on stability and performance
  - [ ] Track and prioritize any critical issues discovered by early adopters

When all items above look healthy and stable over time, the platform can be considered **fully live** for production use.

