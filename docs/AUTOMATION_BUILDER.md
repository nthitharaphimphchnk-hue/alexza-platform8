# Automation Builder

The Automation Builder lets you create workflows that connect triggers, AI actions, and outputs. Automate repetitive tasks, respond to events, and integrate with external systems.

## Overview

- **Page**: `/app/workflows`
- **Concepts**: Workflows consist of ordered steps (trigger → action → output)
- **Execution**: Steps run sequentially; each step receives output from previous steps

## Triggers

| Type | Description |
|------|-------------|
| **Webhook** | POST to `/api/workflows/trigger/:workflowId` to run the workflow. No auth required. |
| **API Event** | Runs when internal events fire (e.g. `action.run.succeeded`, `wallet.topup.succeeded`). |
| **Schedule** | Runs on a cron schedule (e.g. `0 * * * *` = hourly). |

### Webhook Trigger

1. Add a **Webhook** trigger step to your workflow.
2. Copy the trigger URL from the workflow detail page.
3. Configure your external system to POST to that URL with a JSON body.
4. The body is passed as `trigger` data to subsequent steps.

### API Events

Supported events:

- `action.run.succeeded` – AI action completed successfully
- `action.run.failed` – AI action failed
- `auth.user.created` – New user signup
- `wallet.topup.succeeded` – Credits added
- `wallet.low_balance` – Low balance warning

### Schedule Trigger

Use standard cron expressions (e.g. `0 * * * *` for hourly, `*/15 * * * *` for every 15 minutes).

## Actions

| Type | Description |
|------|-------------|
| **Run AI Action** | Execute a project action with optional input. Uses trigger/previous step data. |
| **Call Webhook** | HTTP request to an external URL (GET, POST, PUT, PATCH). |

## Outputs

| Type | Description |
|------|-------------|
| **Send Webhook** | POST workflow data to an external URL. |
| **Log Result** | Log the accumulated data (for debugging). |

## API Reference

### Workflows

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workflows` | List workflows (workspace-scoped) |
| POST | `/api/workflows` | Create workflow |
| GET | `/api/workflows/:id` | Get workflow and steps |
| PATCH | `/api/workflows/:id` | Update workflow (name, enabled) |
| DELETE | `/api/workflows/:id` | Delete workflow |
| POST | `/api/workflows/:id/execute` | Execute workflow (auth required) |
| POST | `/api/workflows/trigger/:workflowId` | Webhook trigger (no auth) |

### Steps

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/workflows/:id/steps` | Add step |
| PATCH | `/api/workflows/:id/steps/:stepId` | Update step |
| DELETE | `/api/workflows/:id/steps/:stepId` | Remove step |

### Execute

**POST** `/api/workflows/:id/execute`

```json
{
  "triggerPayload": { "key": "value" }
}
```

Returns `{ ok: true, data: { ... } }` with accumulated step outputs.

### Webhook Trigger

**POST** `/api/workflows/trigger/:workflowId`

Body: any JSON. Passed as `trigger` to the first step. No authentication required.

## Database

- **workflows**: `name`, `workspaceId`, `ownerUserId`, `enabled`, `createdAt`, `updatedAt`
- **workflow_steps**: `workflowId`, `type` (trigger|action|output), `order`, `config`, `nextStepId`, `createdAt`, `updatedAt`

## Example Workflow

1. **Trigger**: Webhook
2. **Action**: Run AI Action (project X, action `summarize_text`, input from trigger)
3. **Output**: Send Webhook (POST result to Slack/Teams)

When an external system POSTs to the trigger URL with `{ "text": "Long article..." }`, the workflow runs the AI action and sends the summary to your webhook.
