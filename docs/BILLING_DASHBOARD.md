# Billing Dashboard

Workspace owners can view credit usage and costs across their projects.

## Overview

- **Page**: `/app/billing`
- **API**: `GET /api/billing/usage`
- **Access**: Requires authentication. User must belong to workspace (owns projects or has workspace membership).

## API Reference

### GET /api/billing/usage

Returns aggregated usage statistics for the authenticated user's projects.

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| days | number | Time range: `7`, `30`, or `90` (default: 30) |

**Response:**

```json
{
  "ok": true,
  "totalCreditsUsed": 1250,
  "creditsRemaining": 8750,
  "dailyUsage": [
    { "date": "2026-03-01", "credits": 45 },
    { "date": "2026-03-02", "credits": 52 }
  ],
  "usageByProject": [
    { "projectId": "...", "projectName": "My Project", "credits": 800 }
  ],
  "usageByApiKey": [
    { "apiKeyId": "...", "keyPrefix": "axza_abc1", "credits": 400 }
  ],
  "usageByAction": [
    { "actionName": "summarize", "credits": 300 }
  ],
  "range": {
    "days": 30,
    "from": "2026-02-05T00:00:00.000Z",
    "to": "2026-03-07T00:00:00.000Z"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| totalCreditsUsed | number | Credits consumed in the period |
| creditsRemaining | number | User's wallet balance |
| dailyUsage | array | Per-day credits |
| usageByProject | array | Credits by project |
| usageByApiKey | array | Credits by API key |
| usageByAction | array | Credits by action name |

## Data Sources

- **usage_logs** – Primary source. Aggregated by projectId, apiKeyId, actionName (from endpoint), date
- **wallet** – creditsRemaining from user's wallet balance
- Credits computed as `max(1, ceil(tokens / 1000))` per request

## UI Sections

1. **Total usage** – Total credits used in the period
2. **Credits remaining** – Current wallet balance
3. **Daily usage chart** – Bar chart (Recharts)
4. **Usage by project** – Pie chart + table
5. **Usage by API key** – Pie chart + table
6. **Usage by action** – Pie chart + table

## Filters

- **7 days** – Last week
- **30 days** – Last month (default)
- **90 days** – Last quarter

## Security

- User must be authenticated
- Usage is scoped to projects the user owns or has access to via workspace membership
- Uses `getWorkspaceIdsForUser` and project filter: `ownerUserId = user` OR `workspaceId in user's workspaces`
