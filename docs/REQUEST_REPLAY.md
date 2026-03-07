# Request Replay (Debug Mode)

Request Replay allows you to re-run previous API requests directly from the request logs. Useful for debugging, reproducing issues, or testing with the same input.

## Overview

- **Endpoint**: `POST /api/requests/:id/replay`
- **Auth**: Session auth (user must be logged in)
- **Requirement**: Request must have stored input (newer requests only; older logs may not have input)

## How It Works

1. **Stored input**: When a request is logged, the request body (`{ input: {...} }`) is stored in `api_requests.input`.
2. **Replay**: The replay endpoint loads the original request, verifies ownership, and re-executes it via `POST /v1/projects/:projectId/run/:actionName` with the same payload.
3. **Context**: Replay uses the same workspace permissions and project API key context (creates a temporary key for the request, then revokes it).
4. **Audit**: Each replay is logged as `request.replayed` in the audit logs.

## Using Request Replay

### From the UI

1. Go to **Requests** (or `/app/requests`)
2. Click a request to open its detail page
3. If the request has stored input, a **Replay Request** button appears
4. Click to replay; the result is shown below the button

### From the API

```bash
POST /api/requests/{requestId}/replay
Cookie: <session-cookie>
```

**Success (200):** Returns the run result (same shape as `POST /v1/projects/:projectId/run/:actionName`):

```json
{
  "ok": true,
  "requestId": "...",
  "output": "...",
  "creditsCharged": 5,
  "usage": { "tokens": 150, "creditsCharged": 5 },
  "latencyMs": 1200
}
```

**Replay not available (400):** Request has no stored input (e.g. older logs):

```json
{
  "ok": false,
  "error": "REPLAY_NOT_AVAILABLE",
  "message": "Request cannot be replayed: no stored input"
}
```

## Security

- **Ownership**: User must own the request (project owner or workspace member with access)
- **Permissions**: Same workspace/project access rules as viewing request detail
- **Logging**: Replay attempts are logged with pino; audit event `request.replayed` is recorded

## Limitations

- Only requests logged **after** input storage was enabled have replay capability
- Replay consumes credits (same as a normal run)
- Temporary API key is created and revoked for each replay
