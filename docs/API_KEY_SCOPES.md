# API Key Scopes

API keys can have limited permissions (scopes) instead of full access. Use scopes for least-privilege security.

## Supported Scopes

| Scope | Description | Example Endpoints |
|-------|-------------|-------------------|
| `run:actions` | Execute actions | `POST /v1/run`, `POST /v1/projects/:projectId/run/:actionName` |
| `read:projects` | List and read projects, actions | `GET /api/projects`, `GET /api/projects/:id/actions` |
| `manage:projects` | Create, update, delete projects | (future) |
| `read:analytics` | View usage analytics | `GET /api/analytics/overview`, `GET /api/analytics/projects`, etc. |
| `read:requests` | View API request history | `GET /api/requests`, `GET /api/requests/:id` |
| `manage:webhooks` | Create, update, delete webhooks | (future) |
| `manage:api_keys` | Create, list, revoke API keys | (future) |

## Creating Keys with Scopes

### API

```bash
POST /api/projects/:projectId/keys
Content-Type: application/json
Authorization: Bearer <session-token>

{
  "name": "CI/CD key",
  "scopes": ["run:actions"]
}
```

- **`scopes`** (optional): Array of scope strings. Omit or pass empty for full access (backward compatible).
- Invalid scopes return `400` with `VALIDATION_ERROR`.

### UI

On the API Keys page, when creating a key:

1. Enter an optional name.
2. Select scopes (optional). Leave all unchecked for full access.
3. Create the key. The raw key is shown once.

## Scope Enforcement

- Keys **without** scopes (legacy keys) have full access.
- Keys **with** scopes are restricted to those scopes.
- Missing scope returns `403` with `{ "error": "insufficient_scope" }`.

## Least-Privilege Examples

### CI/CD – run only

```json
{ "name": "CI key", "scopes": ["run:actions"] }
```

### Monitoring – read analytics and requests

```json
{ "name": "Monitoring", "scopes": ["read:analytics", "read:requests"] }
```

### Read-only integration

```json
{ "name": "Read-only", "scopes": ["read:projects", "read:analytics", "read:requests"] }
```

## Backward Compatibility

- Existing keys (no `scopes` field) continue to work with full access.
- No migration required.
- New keys default to full access when `scopes` is omitted.
