# Billing Ledger & Usage Billing Engine

The billing ledger records every charged usage for accurate revenue, cost, and margin tracking.

## Collection: `billing_ledger`

| Field | Type | Description |
|-------|------|-------------|
| requestId | string | Unique per run (idempotency key) |
| userId | ObjectId | Owner user |
| projectId | ObjectId | Project |
| apiKeyId | ObjectId | API key used |
| actionName | string | Action or endpoint |
| provider | string | openai, openrouter |
| model | string | Model ID (e.g. gpt-4o, openai/gpt-4o-mini) |
| inputTokens | number | Input token count |
| outputTokens | number | Output token count |
| totalTokens | number | Total tokens |
| creditsCharged | number | Credits deducted |
| costUsd | number | Upstream provider cost (USD) |
| revenueUsd | number | Revenue (credits × credit price) |
| marginUsd | number | revenueUsd - costUsd |
| createdAt | Date | Timestamp |

## Idempotency

Each `requestId` is unique. Duplicate inserts are skipped (unique index on `requestId`).

## Per-Model Pricing

Upstream costs are configured in `server/config/modelPricing.ts`:

- **gpt-4o**: $2.50/1M input, $10/1M output
- **gpt-4o-mini**: $0.15/1M input, $0.60/1M output
- **Claude models**: Anthropic pricing
- **Unknown models**: Default $0.001/1K input, $0.003/1K output

## Integration Points

Ledger entries are recorded when:

1. `POST /v1/projects/:projectId/run/:actionName` succeeds (runBySpec)
2. `POST /v1/run` succeeds (legacy run)
3. AI runner worker completes a job

## Admin Billing Analytics

- **Route**: `/app/admin/billing`
- **API**: `GET /api/admin/billing/analytics?days=30`
- **Headers**: `x-admin-key` (required)

Returns:

- Summary: totalCredits, totalCostUsd, totalRevenueUsd, totalMarginUsd, transactionCount
- byModel: breakdown by model
- byDay: daily time series
- topUsers, topProjects: by credits charged
