# ALEXZA AI System Status

## Overview

The status page and health endpoints allow users to check platform availability and system health.

- **Status Page**: [https://alexza-platform8.onrender.com/status](/status)
- **Status API**: `GET /api/status`

## Health Endpoints

Each endpoint returns `{ status, latency, timestamp }` where:
- `status`: `operational` | `degraded` | `down`
- `latency`: Response time in milliseconds
- `timestamp`: ISO 8601 string

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Basic API health |
| `GET /health/db` | Database (MongoDB) connectivity |
| `GET /health/stripe` | Stripe API connectivity |
| `GET /health/webhooks` | Webhook configuration (Stripe webhook secret) |

No authentication required.

## Status API

`GET /api/status` returns aggregated status for all components:

```json
{
  "ok": true,
  "components": [
    { "name": "API", "status": "operational", "latency": 1 },
    { "name": "Database", "status": "operational", "latency": 12 },
    { "name": "Stripe", "status": "operational", "latency": 145 },
    { "name": "Webhooks", "status": "operational", "latency": 0 },
    { "name": "Workers", "status": "operational" }
  ],
  "uptime24h": 100,
  "timestamp": "2026-03-07T12:00:00.000Z"
}
```

## Uptime

Uptime for the last 24 hours is tracked by the status monitor, which checks all health endpoints every 60 seconds. The percentage reflects how many checks passed.

## Monitoring

- Health checks run every 60 seconds (server-side)
- Status page auto-refreshes every 60 seconds (client-side)
- Logging uses pino (structured JSON logs)

## Status Indicators

| Color | Status | Meaning |
|-------|--------|---------|
| Green | operational | Component is healthy |
| Yellow | degraded | Configuration or partial outage |
| Red | down | Component is unavailable |
