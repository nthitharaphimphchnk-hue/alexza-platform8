# Soft Launch Metrics Panel

This document describes the focused soft launch metrics view for ALEXZA AI.

## Overview

During the first days and weeks of soft launch, it&apos;s important to have a simple dashboard that answers:

- Are new users signing up and creating workspaces/projects?
- Are users reaching their first successful AI run?
- Are there any reliability issues (errors, webhook failures)?
- How much feedback (and especially critical feedback) are we getting?

The **Soft Launch Metrics** panel provides a compact, read-only view over these signals.

## Admin API

Endpoint:

```http
GET /api/admin/soft-launch-metrics
```

Access:

- Admin-only, protected by `ADMIN_API_KEY` via the `x-admin-key` header.

Query parameters:

- `window` – time window for metrics:
  - `24h` (default)
  - `7d`
  - `30d`

Response shape:

```json
{
  "ok": true,
  "window": "24h",
  "range": {
    "from": "2026-03-10T12:00:00.000Z",
    "to": "2026-03-11T12:00:00.000Z"
  },
  "metrics": {
    "newSignups": 42,
    "newSignups7d": 180,
    "newWorkspaces": 15,
    "newProjects": 37,
    "firstSuccessfulRuns": 21,
    "totalApiRuns": 560,
    "feedbackCount": 18,
    "criticalFeedbackCount": 2,
    "webhookFailures": 3,
    "errorCount": 12
  },
  "series": {
    "signups": [
      { "timestamp": "2026-03-11T09:00:00.000Z", "count": 4 }
    ],
    "runs": [
      { "timestamp": "2026-03-11T09:00:00.000Z", "count": 40 }
    ],
    "feedback": [
      { "timestamp": "2026-03-11T09:00:00.000Z", "count": 2 }
    ]
  }
}
```

### Data sources

The API reuses existing collections:

- `users` – for **new signups**.
- `workspaces` – for **new workspaces**.
- `projects` – for **new projects**.
- `usage_logs` – for:
  - **firstSuccessfulRuns**: count of distinct `ownerUserId` with `status = "success"` in the window.
  - **totalApiRuns**: number of usage log entries in the window.
- `feedback` – for:
  - **feedbackCount**: total feedback items in the window.
  - **criticalFeedbackCount**: feedback with `priority = "critical"` in the window.
- `webhook_deliveries` – for **webhookFailures** (failed deliveries in the window).
- `errors` – for **errorCount** (errors in the window).

Time series data (`series`) are grouped in hourly buckets for the selected window.

## Soft Launch Admin Page

Route:

```text
/app/admin/soft-launch
```

This admin-only page calls `GET /api/admin/soft-launch-metrics` and renders:

### Summary cards

- **New signups**
  - Primary: signups in the selected window.
  - Secondary: signups in the last 7 days (helps compare 24h vs 7d).
- **New workspaces**
  - Primary: new workspaces in the window.
  - Secondary: new projects in the window.
- **First successful AI runs**
  - Primary: number of distinct users with at least one successful AI run in the window.
  - Secondary: total API runs in the window.
- **Feedback & Reliability**
  - Feedback count.
  - Critical feedback count.
  - Webhook failures.
  - Error count.

### Charts

Simple, lightweight bar charts:

- **Signups over time** – from `series.signups`.
- **API runs over time** – from `series.runs`.
- **Feedback over time** – from `series.feedback`.

These charts use hourly buckets (or as available in the selected window) and are meant for quick visual trends, not detailed analytics.

### Time window filter

At the top-right of the page, admins can switch the window:

- `24h`
- `7d`
- `30d`

Switching the window triggers a reload of the soft launch metrics API.

## Recommended usage during soft launch

1. Keep the **Soft Launch Metrics** page open during the first 24–72 hours.
2. Monitor:
   - That new signups and first successful AI runs are trending upward.
   - That feedback volume is healthy (some feedback is good; a lot of critical feedback is a signal).
   - That error and webhook failure counts stay low.
3. Use the metrics alongside:
   - `/app/admin/monitoring` for deeper operational metrics.
   - `/app/admin/feedback` for detailed feedback triage.
4. After the soft launch window, you can continue to use this panel as a high-level growth and stability snapshot for new cohorts.

