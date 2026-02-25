# OAuth Setup (Google & GitHub)

This document describes how to configure OAuth login/signup with Google and GitHub for ALEXZA AI.

## Overview

- **Flow**: User clicks Google/GitHub → redirects to provider → callback to backend → session cookie set → redirect to dashboard
- **Session**: HttpOnly secure cookie, same-origin or cross-origin (SameSite=None when CLIENT_URL set)
- **User creation**: First-time OAuth users get a new account with 500 free credits

## Environment Variables

### Required (Backend)

| Variable | Description | Example |
|----------|-------------|---------|
| `SESSION_SECRET` | Secret for signing session/state | `your-random-secret` |
| `OAUTH_REDIRECT_BASE_URL` | Base URL for OAuth callbacks (where provider redirects back) | `https://alexza-platform8.onrenderer.com` |
| `FRONTEND_APP_URL` or `CLIENT_URL` | Frontend base URL for post-login redirect | `https://alexza-platform8.onrenderer.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | From Google Cloud Console |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID | From GitHub Developer Settings |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret | From GitHub Developer Settings |

### Optional

| Variable | Description |
|----------|-------------|
| `OAUTH_ALLOWED_REDIRECTS` | Comma-separated extra redirect URLs |
| `APP_BASE_URL` | Alias for FRONTEND_APP_URL (used when OAUTH_REDIRECT_BASE_URL is unset) |

### Local Development

For local dev with Vite proxy (frontend on :3000, backend on :3002):

- `OAUTH_REDIRECT_BASE_URL` = `http://localhost:3000` (callback must hit same origin as frontend so cookies work)
- `FRONTEND_APP_URL` = `http://localhost:3000`
- `CLIENT_URL` = `http://localhost:3000`

The Vite config proxies `/auth` to the backend, so `/auth/google` and `/auth/google/callback` are handled by the backend.

---

## Google OAuth Setup

### 1. Create OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
4. Application type: **Web application**
5. Name: e.g. "ALEXZA AI"
6. **Authorized JavaScript origins**:
   - Dev: `http://localhost:3000`
   - Prod: `https://alexza-platform8.onrenderer.com`
7. **Authorized redirect URIs**:
   - Dev: `http://localhost:3000/auth/google/callback`
   - Prod: `https://alexza-platform8.onrenderer.com/auth/google/callback`
8. Copy **Client ID** and **Client Secret** to your `.env.local`

### 2. Scopes

The app requests: `openid email profile`

### 3. Configure env

```bash
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

---

## GitHub OAuth Setup

### 1. Create OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. **OAuth Apps** → **New OAuth App**
3. Application name: e.g. "ALEXZA AI"
4. Homepage URL:
   - Dev: `http://localhost:3000`
   - Prod: `https://alexza-platform8.onrenderer.com`
5. **Authorization callback URL**:
   - Dev: `http://localhost:3000/auth/github/callback`
   - Prod: `https://alexza-platform8.onrenderer.com/auth/github/callback`
6. Register and copy **Client ID**
7. Generate **Client Secret** and copy it

### 2. Scopes

The app requests: `user:email` (to fetch primary email if not public)

### 3. Configure env

```bash
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

---

## Production (Render)

1. Set all env vars in Render dashboard
2. `OAUTH_REDIRECT_BASE_URL` = your Render URL (e.g. `https://alexza-platform8.onrenderer.com`)
3. `FRONTEND_APP_URL` or `CLIENT_URL` = same URL (when frontend and backend share the domain)
4. `TRUST_PROXY=1` for correct `req.protocol` behind proxy
5. Ensure Google and GitHub callback URLs in provider consoles match your production domain

---

## Error Handling

On OAuth failure, the user is redirected to `/login?error=<code>` (or `/signup?error=<code>`). Common codes:

| Code | Meaning |
|------|---------|
| `OAUTH_DENIED` | User cancelled or denied consent |
| `OAUTH_CONFIG` | OAuth not configured (missing env) |
| `OAUTH_STATE_INVALID` | State cookie missing or expired |
| `OAUTH_TOKEN_FAILED` | Token exchange failed |
| `OAUTH_INCOMPLETE_PROFILE` | Provider did not return email |

The frontend shows a toast with a user-friendly message and clears the error from the URL.
