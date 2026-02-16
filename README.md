# Alexza AI

## Local API health checks

After starting the server, test these endpoints in your browser:

- `/api/health`
- `/api/health/db`

Expected DB response when Mongo is connected:

```json
{ "ok": true, "db": "connected" }
```

## Run

```bash
pnpm dev
pnpm build
pnpm start
```
