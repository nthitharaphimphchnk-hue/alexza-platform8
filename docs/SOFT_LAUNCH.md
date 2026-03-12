# ALEXZA AI – Soft Launch Toolkit

This guide explains how to safely roll out ALEXZA AI to real users using production smoke tests, demo content seeding, admin launch monitoring, and feature flags.

---

## 1. Running production smoke tests

Use the production smoke script to validate that a deployed environment is reachable and that key public and API routes work as expected.

From the project root:

```bash
PROD_BASE_URL="https://your-domain.com" pnpm exec tsx scripts/production-smoke.ts
```

Optional:

- Set `PROD_SMOKE_API_KEY` to a test API key to run a live `POST /v1/run` call.

The script checks:

- Homepage (`/`)
- Docs (`/docs`)
- Playground (`/app/playground`)
- Pricing (`/pricing`)
- Login / Signup (`/login`, `/signup`)
- Health endpoints (`/api/health`, `/api/health/db`, `/api/health/openai`)
- Marketplace & community APIs
- Webhook routes presence (`/api/webhooks`)
- Billing endpoints presence (`/api/billing/stripe/summary`)
- Optional `POST /v1/run` if `PROD_SMOKE_API_KEY` is provided

Results are printed as `PASS / WARN / FAIL` lines with an overall status at the end.

---

## 2. Seeding demo content

To make the app feel “alive” during soft launch, you can seed demo content (agents, workflows, packs, apps, creators).

1. Choose or create a **demo owner user** and **workspace** in your production DB.
2. Note their IDs (MongoDB ObjectId strings).
3. Set the following environment variables when running the script:

```bash
DEMO_OWNER_USER_ID="<userId from users._id>"
DEMO_WORKSPACE_ID="<workspaceId from workspaces._id>"
pnpm exec tsx scripts/seed-demo-content.ts
```

The script upserts:

- A “Getting Started Pack” template pack
- A “Demo Support Agent”
- A “Demo Lead Qualification Workflow”
- A “Demo AI Workspace” app
- An `alexza_demo` creator profile

These records are tagged or described as **demo/featured** content and owned by the specified demo user/workspace, so you can easily filter or remove them later if needed.

---

## 3. Recommended rollout order

A safe soft launch typically follows this sequence:

1. **Pre-launch readiness**
   - Deploy the backend and frontend to your production environment.
   - Configure environment variables (see `LAUNCH_CHECKLIST.md`).
   - Run the **production readiness script**:
     ```bash
     PROD_BASE_URL="https://your-domain.com" pnpm exec tsx scripts/production-readiness.ts
     ```
   - Confirm `Overall: READY` or address any `FAIL` statuses before proceeding.

2. **Demo content & internal testing**
   - Seed demo content with `scripts/seed-demo-content.ts`.
   - Have internal team members exercise:
     - Signup/login
     - Projects & API keys
     - Playground and AI runs
     - Marketplace & Community pages
     - Webhooks and billing (in test mode)

3. **Feature flags & gradual exposure**
   - Use environment variables to control major surfaces:
     - `PUBLIC_PLAYGROUND_ENABLED`
     - `MARKETPLACE_ENABLED`
     - `COMMUNITY_ENABLED`
     - `APP_STORE_ENABLED`
     - `AGENT_MARKETPLACE_ENABLED`
     - `WORKFLOW_MARKETPLACE_ENABLED`
   - Start with only the core runtime and docs visible, then progressively enable:
     1. Public Playground
     2. Templates / Starter Packs
     3. Marketplace & Community
     4. App Store and creator monetization (if Stripe is ready)

4. **External beta**
   - Invite a small group of external users.
   - Monitor behaviour via the Admin Launch Dashboard (see below) and Sentry.

5. **General availability**
   - When systems are stable and metrics look healthy, enable all relevant feature flags and announce broader availability.

---

## 4. Admin launch dashboard

An admin-only dashboard is available at:

- `/app/admin/launch`

This page requires the admin API key to be supplied via the `x-admin-key` header (same as other admin analytics routes). It shows:

- Readiness summary (`PASS / WARN / FAIL` and API health status)
- Total users
- Active users in the last 24 hours
- Request volume in the last 24 hours
- Error count in the last 24 hours
- Webhook failure count in the last 24 hours
- Billing/wallet event count in the last 24 hours
- Featured content counts (templates, agents, workflows, packs, apps)

Use this dashboard during soft launch to keep a real-time pulse on platform health.

---

## 5. Rollback plan

If serious issues arise during soft launch:

1. **Stabilize**
   - Temporarily disable high-risk surfaces using feature flags:
     - Set `MARKETPLACE_ENABLED=false`, `COMMUNITY_ENABLED=false`, etc.
   - Optionally disable new signups by turning off public signup in config (if available).

2. **Communicate**
   - Update your status page with a clear incident note.
   - Notify early users (email or in-app message) about limited availability while you investigate.

3. **Deploy rollback**
   - Revert to the previously working deployment (container image, commit, or Render deploy).
   - Confirm:
     - `/api/health` and `/api/health/db` return `ok: true`.
     - Critical flows (login, projects, run) are functional.

4. **Verify**
   - Re-run:
     ```bash
     PROD_BASE_URL="https://your-domain.com" pnpm exec tsx scripts/production-readiness.ts
     PROD_BASE_URL="https://your-domain.com" pnpm exec tsx scripts/production-smoke.ts
     ```
   - Review Sentry and logs to understand root cause before attempting another soft launch.

---

## 6. First 24 hours monitoring checklist

During the first day after opening real traffic, monitor closely:

### Platform health

- [ ] `/api/health` and `/api/health/db` remain `ok: true`
- [ ] Readiness and smoke scripts continue to pass
- [ ] Admin Launch Dashboard shows stable or improving metrics

### Usage & performance

- [ ] Request volume is within expected range
- [ ] Error count remains low and no new critical issues appear in Sentry
- [ ] Response times are acceptable (no sustained timeouts or 5xx spikes)

### Webhooks & billing

- [ ] Webhook failures are rare and retry successfully
- [ ] Stripe webhooks are being received without signature or processing errors
- [ ] Wallet/billing events match actual payments in Stripe Dashboard

### User experience

- [ ] New users can sign up and log in without friction
- [ ] Projects, API keys, and Playground run flows are smooth
- [ ] Marketplace & Community pages load quickly and show demo/featured content

If all the above look good after 24 hours, you can proceed to widen access and rely on the toolkit (scripts + admin dashboard + feature flags) as ongoing safety rails for your production operations.

