# Alexza AI

## Local API health checks

After starting the server, test these endpoints in your browser:

- `/api/health`
- `/api/health/db`
- `/api/health/openai`

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

Set these env values in `.env.local` for OpenAI:

```bash
OPENAI_API_KEY="your_openai_api_key"
OPENAI_MODEL="gpt-4o-mini"
```

### Ports

- Backend API runs on `http://localhost:3002`
- Frontend (Vite dev server) can run on any available localhost port, but it always calls API at `http://localhost:3002`

## Auth Smoke Test

Set `SESSION_SECRET` in `.env.local` before testing auth endpoints.

```bash
# 1) Signup
curl -i -c cookies.txt -X POST http://localhost:3002/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123","name":"Demo User"}'

# 2) Login
curl -i -c cookies.txt -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}'

# 3) Me
curl -i -b cookies.txt http://localhost:3002/api/me

# 4) Logout
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3002/api/auth/logout
```

## Projects Smoke Test

Use the same cookie session from auth (`cookies.txt`).

```bash
# 1) Create project
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3002/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"My First Project","description":"From curl","model":"GPT-4"}'

# 2) List current user's projects
curl -i -b cookies.txt http://localhost:3002/api/projects

# 3) Get one project by id
curl -i -b cookies.txt http://localhost:3002/api/projects/<project_id>
```

## API Keys Smoke Test

Use a valid project id from the projects API.

```bash
# 1) Create key (rawKey is returned only once)
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3002/api/projects/<project_id>/keys \
  -H "Content-Type: application/json" \
  -d '{"name":"Production Key"}'

# 2) List keys (rawKey is NOT returned)
curl -i -b cookies.txt http://localhost:3002/api/projects/<project_id>/keys

# 3) Revoke key
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3002/api/projects/<project_id>/keys/<key_id>/revoke
```

After refresh, raw key cannot be retrieved again from list endpoints.

## Run Endpoint Smoke Test (`/v1/run`)

Use the raw API key returned from `POST /api/projects/<project_id>/keys`.

```bash
# 1) Health check for OpenAI config
curl -i http://localhost:3002/api/health/openai

# 2) Run with API key in x-api-key
curl -i -X POST http://localhost:3002/v1/run \
  -H "Content-Type: application/json" \
  -H "x-api-key: <raw_api_key>" \
  -d '{"input":"Hello from curl"}'
```

Expected success response shape:

```json
{ "ok": true, "output": "...", "model": "gpt-4o-mini", "usage": {} }
```
