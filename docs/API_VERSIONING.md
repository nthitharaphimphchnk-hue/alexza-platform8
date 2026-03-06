# ALEXZA AI API Versioning

## Overview

ALEXZA AI uses explicit API versioning to ensure stability for production clients while allowing future improvements.

## Current Versions

| Version | Status | Base Path |
|---------|--------|-----------|
| **v1** | Stable (current) | `/v1` |
| **v2** | Scaffold (coming soon) | `/v2` |

## v1 (Stable)

All `/v1/*` endpoints are the primary public API. They are stable and backward compatible.

### Runtime Endpoints

- **`POST /v1/projects/:projectId/run/:actionName`** — Run an action by name (recommended)
- **`POST /v1/run`** — Legacy single-input run (deprecated)

### Deprecated Endpoints

Deprecated endpoints remain functional but include response headers:

- `X-Alexza-Deprecated: true`
- `X-Alexza-Replacement: /v1/projects/:projectId/run/:actionName`

Migrate to the replacement endpoint before the deprecated one is removed.

## v2 (Future)

`/v2` is reserved for future versions. When implemented, it may introduce:

- Breaking changes to request/response shapes
- New pagination or filtering
- Different authentication options

Until v2 is released, `GET /v2` returns a placeholder response.

## Best Practices

1. **Use v1 explicitly** — Always call `/v1/...` in SDK, CLI, and integrations.
2. **Prefer action-based run** — Use `POST /v1/projects/:projectId/run/:actionName` over `POST /v1/run`.
3. **Check deprecation headers** — If you see `X-Alexza-Deprecated`, plan migration.
4. **Watch for announcements** — v2 or endpoint removals will be announced in advance.

## SDK / CLI

The official SDK and CLI use `/v1` endpoints. No changes required for existing integrations.
