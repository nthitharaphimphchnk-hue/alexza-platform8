# Usage Limits & Billing Guardrails

This document describes how ALEXZA AI enforces per-user monthly usage limits to prevent runaway API usage and unexpected costs.

The guardrails use existing billing data (credits and billing ledger) and can be tuned per user.

## Concepts

- **Credits** – the internal unit for billing AI usage. Credits are deducted from each user&apos;s wallet for API runs.
- **Monthly usage limit** – a hard cap on how many credits a user can consume in a billing month.
- **Warning threshold** – a soft threshold (e.g. 80% of the limit) at which the system logs a warning and records an event.

## Data model

User documents in the `users` collection include:

- `monthlyCreditsAllowance` – default monthly quota in credits, based on plan.
- `monthlyUsageLimit` (optional) – explicit per-user monthly limit in credits.
  - If not set, the system uses `monthlyCreditsAllowance` as the limit.
- `usageWarningThreshold` (optional) – threshold in credits at which warnings are emitted.
  - If not set, the system uses `0.8 * monthlyUsageLimit`.

Usage is measured from the immutable `billing_ledger` collection, which records `creditsCharged` for each completed AI run.

## How guardrails work

Before executing `POST /v1/projects/:projectId/run/:actionName`, the runtime:

1. Estimates the credits required for the run from the prompt and model.
2. Computes the current month usage for the user from `billing_ledger`.
3. Calculates the projected usage: `used + estimatedCredits`.
4. Compares the projected usage to:
   - `usageWarningThreshold` – if crossed, a warning event is recorded.
   - `monthlyUsageLimit` – if exceeded, the run is blocked.

### Warning behavior

When the projected usage reaches or exceeds `usageWarningThreshold` but is still below the hard limit:

- A warning entry is logged via the structured logger with context:
  - `userId`, `used`, `projected`, `limit`, `warningThreshold`
- A document is inserted into `usage_limit_events` with the same data and a timestamp.

You can build admin views or reports on top of `usage_limit_events` to proactively reach out to high-usage customers.

### Hard limit behavior

When the projected usage exceeds `monthlyUsageLimit`:

- The request is rejected before any upstream AI provider is called.
- The response for `POST /v1/projects/:projectId/run/:actionName` is:

```json
{
  "ok": false,
  "error": {
    "code": "USAGE_LIMIT_REACHED",
    "message": "Monthly usage limit reached"
  },
  "requestId": "..."
}
```

- The event is logged in:
  - `usage_logs` / `run_logs` / `api_requests` for analytics and debugging.
  - `usage_limit_events` with `status: "block"`.

This ensures the user cannot exceed their configured monthly usage limit, even if they still have wallet credits remaining.

## Configuration

There is no separate API yet for editing usage limits; they are stored on the `users` collection.

You can configure limits via admin scripts or the MongoDB shell, for example:

```js
// Set an explicit 50,000 credit monthly limit and 80% warning threshold
db.users.updateOne(
  { email: "customer@example.com" },
  {
    $set: {
      monthlyUsageLimit: 50000,
      usageWarningThreshold: 40000
    }
  }
);
```

If `monthlyUsageLimit` is not set, the system uses `monthlyCreditsAllowance` (based on the user&apos;s plan).

If `usageWarningThreshold` is not set, the system uses `0.8 * monthlyUsageLimit`.

## Recommended usage limit policy

Suggested defaults:

- **Free plan**:
  - `monthlyUsageLimit = monthlyCreditsAllowance` (e.g. 1,000 credits).
  - `usageWarningThreshold = 0.8 * limit`.
- **Paid plans**:
  - Set `monthlyUsageLimit` to a comfortable multiple of the allowance, or keep it equal and rely on wallet top-ups.
  - Keep `usageWarningThreshold` at 70–90% of limit depending on how early you want to warn.

Operational tips:

- Review `usage_limit_events` for `"status": "warn"` regularly to identify customers approaching their limits.
- Offer plan upgrades or custom limits for consistently high-usage customers.
- For enterprise tenants, consider setting higher limits and pairing them with external alerting/monitoring.

