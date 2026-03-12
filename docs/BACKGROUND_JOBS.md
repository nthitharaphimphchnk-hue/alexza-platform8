# Background Jobs (BullMQ + Redis)

ALEXZA AI uses BullMQ with Redis for background job processing. When `REDIS_URL` is set, long-running tasks are moved off the request thread to worker processes.

## Queues

| Queue | Purpose | Concurrency |
|-------|---------|-------------|
| `ai_runs` | AI action execution (async mode) | 5 |
| `webhook_deliveries` | HTTP POST to webhook endpoints | 10 |
| `workflow_jobs` | Workflow step execution | 5 |
| `email_jobs` | Low-credits alerts, transactional emails | 3 |

## Running Workers

```bash
REDIS_URL="redis://localhost:6379" pnpm run workers
```

Workers must run in a separate process from the API server. In production, run workers on one or more instances (e.g. separate Render worker services).

## Job Retries

All jobs retry on failure:

- **Attempts**: 3
- **Backoff**: Exponential (1s, 2s, 4s)

## Async AI Runs

To run an action in the background instead of blocking the request:

```bash
# Header
curl -X POST "https://api.alexza.ai/v1/projects/PROJECT_ID/run/ACTION_NAME" \
  -H "x-api-key: axza_xxx" \
  -H "X-Async: true" \
  -H "Content-Type: application/json" \
  -d '{"input":{"text":"Hello"}}'

# Or query param
curl -X POST "https://api.alexza.ai/v1/projects/PROJECT_ID/run/ACTION_NAME?async=1" \
  -H "x-api-key: axza_xxx" \
  -H "Content-Type: application/json" \
  -d '{"input":{"text":"Hello"}}'
```

Response (202):

```json
{
  "ok": true,
  "requestId": "uuid",
  "status": "queued",
  "message": "Job queued for background processing"
}
```

Poll for result:

```bash
GET /v1/projects/PROJECT_ID/jobs/REQUEST_ID
```

Response when completed:

```json
{
  "ok": true,
  "requestId": "uuid",
  "status": "completed",
  "output": "...",
  "creditsCharged": 5,
  "usage": { "tokens": 123 },
  "completedAt": "2026-03-11T..."
}
```

## Fallback (No Redis)

When `REDIS_URL` is not set:

- Webhooks run inline (same as before)
- Workflows run inline
- Emails run inline
- Async AI is not available (header/param ignored)

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | For workers | Redis connection URL (e.g. `redis://localhost:6379`) |
