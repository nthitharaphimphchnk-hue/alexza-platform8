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
