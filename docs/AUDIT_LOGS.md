# ALEXZA AI Audit Logs

Audit Logs track important user and team actions for security, debugging, and enterprise readiness.

## Overview

- **Page**: [Audit Logs](/app/audit-logs) or `/app/audit-logs`
- **Access**: Owner and Admin roles can view workspace audit logs
- **Events**: User signup, API keys, projects, actions, webhooks, wallet topups, team membership

## Using Audit Logs

### 1. Open the Audit Logs page

From the sidebar, click **Audit Logs** (or go to `/app/audit-logs`).

### 2. Filter and search

- **Workspace** – Filter by workspace (owner/admin only)
- **Project** – Filter by project
- **Action** – Filter by event type (e.g. api_key.created, project.deleted)
- **Resource** – Filter by resource type (project, action, api_key, webhook, wallet, team, user)
- **Status** – Success or Failed
- **Date range** – From/To dates

Click **Apply** to run filters.

### 3. View details

Click a row to open the detail drawer with full metadata (secrets are redacted).

### 4. Export CSV

Click **Export CSV** to download the current page as a CSV file.

## Tracked Events

| Action Type | Description |
|-------------|-------------|
| `auth.user.created` | New user signup (email or OAuth) |
| `api_key.created` | API key created |
| `api_key.revoked` | API key revoked |
| `project.created` | Project created |
| `project.updated` | Project updated |
| `project.deleted` | Project deleted |
| `action.created` | Action created |
| `action.updated` | Action updated |
| `action.deleted` | Action deleted |
| `webhook.created` | Webhook endpoint created |
| `webhook.updated` | Webhook endpoint updated |
| `webhook.deleted` | Webhook endpoint deleted |
| `wallet.topup.succeeded` | Credits added (manual or Stripe) |
| `team.member.invited` | Workspace member invited |
| `team.member.role_changed` | Member role changed |
| `team.member.removed` | Member removed from workspace |
| `request.replayed` | API request replayed from request logs (debug mode) |

## API Reference

### GET /api/audit-logs

List audit logs with pagination and filters. Auth required.

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number (default: 1) |
| pageSize | number | Items per page (default: 50, max: 100) |
| workspaceId | string | Filter by workspace |
| projectId | string | Filter by project |
| actorUserId | string | Filter by actor |
| actionType | string | Filter by action type |
| resourceType | string | Filter by resource type |
| status | string | success \| failed |
| dateFrom | string | ISO date |
| dateTo | string | ISO date |

**Response:**

```json
{
  "ok": true,
  "items": [...],
  "total": 100,
  "page": 1,
  "pageSize": 50
}
```

## Permissions

- **Owner/Admin** – Can view audit logs for workspaces they own or administer
- **Developer/Viewer** – No access to audit logs
- **Personal projects** – Users can view logs for their own resources (ownerUserId scope)

## Audit Log Retention Policy

Audit logs are automatically deleted based on billing plan retention limits.

| Plan       | Default Retention | Env Variable                    |
|------------|-------------------|---------------------------------|
| Free       | 30 days           | `AUDIT_LOG_RETENTION_FREE`      |
| Pro        | 90 days           | `AUDIT_LOG_RETENTION_PRO`       |
| Enterprise | 365 days          | `AUDIT_LOG_RETENTION_ENTERPRISE`|

- **Daily cleanup** – Runs automatically every 24 hours via in-process scheduler
- **Plan-based** – Each user's logs use their billing plan retention window
- **Safety** – Only logs older than the cutoff date are deleted; newer logs always remain
- **Admin cron** – `POST /api/admin/audit/cron/retention` with `X-Admin-Key` header (production) for external cron triggers

## Security

- **Secrets redacted** – API keys, webhook secrets, tokens are never stored in audit logs
- **Prompt truncation** – Long prompts are truncated to 500 characters
- **Pino logging** – Server logs exclude sensitive fields
