# API Key Usage Analytics

View usage statistics per API key: total requests, credits used, success/failed counts, and daily charts.

## Overview

- **Page**: `/app/api-keys/:id/usage`
- **API**: `GET /api/api-keys/:id/usage`
- **Access**: Requires authentication. User must own the API key (via project access).

## API Reference

### GET /api/api-keys/:id/usage

Returns usage statistics for an API key.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| id | path | API key ID (MongoDB ObjectId) |
| days | query | Time range: `7`, `30`, or `90` (default: 30) |

**Response:**

```json
{
  "ok": true,
  "totalRequests": 1250,
  "creditsUsed": 342,
  "success": 1200,
  "failed": 50,
  "dailyUsage": [
    { "date": "2026-03-01", "requests": 45, "credits": 12 },
    { "date": "2026-03-02", "requests": 52, "credits": 15 }
  ],
  "range": {
    "days": 30,
    "from": "2026-02-05T00:00:00.000Z",
    "to": "2026-03-07T00:00:00.000Z"
  },
  "key": {
    "name": "CI Key",
    "prefix": "axza_abc1",
    "projectId": "507f1f77bcf86cd799439011"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| totalRequests | number | Total API requests in the period |
| creditsUsed | number | Credits consumed (1 credit ≈ 1,000 tokens, min 1 per request) |
| success | number | Successful requests |
| failed | number | Failed requests |
| dailyUsage | array | Per-day breakdown: date, requests, credits |
| key | object | Key metadata (name, prefix, projectId) |

## Data Sources

- **usage_logs** – Aggregated by `apiKeyId` and date
- Credits computed as `max(1, ceil(tokens / 1000))` per request

## UI

From the API Keys page (`/app/projects/:projectId/keys`), click **Usage** on any key to view its analytics.

- **Time range filters**: 7, 30, or 90 days
- **Summary cards**: Total requests, credits used, success, failed
- **Daily chart**: Bar chart of requests per day (Recharts)

## Security

- User must have project access to view key usage
- Returns `404 NOT_FOUND` if key does not exist or user lacks access
