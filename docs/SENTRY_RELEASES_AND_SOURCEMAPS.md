# Sentry Releases and Source Maps

This document explains how to configure Sentry release tracking and source map uploads for the Alexza AI application.

---

## 1. Release Version Strategy

Both backend and frontend use the same release strategy:

| Priority | Source | Example |
|----------|--------|---------|
| 1 | `SENTRY_RELEASE` (backend) / `VITE_SENTRY_RELEASE` (frontend) | `v1.2.3` |
| 2 | `RENDER_GIT_COMMIT` / `GIT_SHA` / `COMMIT_SHA` / `VITE_GIT_SHA` | `abc123def` |
| 3 | Fallback | `dev-local` |

**Backend** reads at runtime from `process.env`.  
**Frontend** receives the release at build time via Vite `define` (from `getSentryRelease()` in `vite.config.ts`).

Ensure both backend and frontend send the **same release string** in production (e.g. use `SENTRY_RELEASE` or `GIT_SHA` on Render for both services).

---

## 2. Where to Get SENTRY_AUTH_TOKEN

1. Go to [Sentry](https://sentry.io) and sign in.
2. Navigate to **Settings** → **Auth Tokens** (or Organization Settings → Auth Tokens).
3. Create a new token with:
   - **Project: Read & Write**
   - **Release: Admin**
4. Copy the token and add it to your build environment (e.g. Render) as `SENTRY_AUTH_TOKEN`.

**Security:** Never commit the token. Use environment variables or secrets in your CI/CD.

---

## 3. Environment Variables on Render

### Backend Service

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | Yes (for monitoring) | Backend project DSN |
| `SENTRY_ENVIRONMENT` | No | Defaults to `NODE_ENV` |
| `SENTRY_TRACES_SAMPLE_RATE` | No | Default `0.1` |
| `SENTRY_PROFILES_SAMPLE_RATE` | No | Default `0` |
| `SENTRY_RELEASE` | No | Override release; else uses `RENDER_GIT_COMMIT` |
| `RENDER_GIT_COMMIT` | Auto (Render) | Git commit SHA; used for release when `SENTRY_RELEASE` not set |

### Frontend Build / Service

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SENTRY_DSN` | Yes (for monitoring) | Frontend project DSN |
| `VITE_SENTRY_ENVIRONMENT` | No | Defaults to `import.meta.env.MODE` |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | No | Default `0.1` |
| `VITE_SENTRY_RELEASE` | No | Override release; else uses `VITE_GIT_SHA` or `RENDER_GIT_COMMIT` |
| `VITE_GIT_SHA` | No | Used for release when `VITE_SENTRY_RELEASE` not set |
| `SENTRY_AUTH_TOKEN` | Yes (for sourcemaps) | Auth token for upload |
| `SENTRY_ORG` | Yes (for sourcemaps) | Sentry org slug |
| `SENTRY_PROJECT` | Yes (for sourcemaps) | Frontend project slug |
| `SENTRY_RELEASE` | No | Same release string as backend |

---

## 4. Verifying Source Maps in Sentry

1. Deploy with `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` set.
2. Trigger a frontend error (e.g. "Test Sentry Frontend" in dev, or a real error in production).
3. In Sentry: **Issues** → select the issue → **Stack Trace**.
4. Confirm the stack trace shows **original source** (file names and line numbers from your code), not minified bundles.

---

## 5. Troubleshooting

### Missing artifacts / wrong release

- Ensure `SENTRY_RELEASE` (or `RENDER_GIT_COMMIT` / `GIT_SHA`) is the same for backend and frontend.
- Check that the build completed and the Sentry plugin ran (look for upload logs in the build output).

### Wrong URL prefix

- The Vite plugin uses `urlPrefix: "~/"` by default.
- If your assets are served from a subpath (e.g. `/app/`), adjust `sourcemaps.urlPrefix` in `vite.config.ts`.

### Build succeeds but no source maps uploaded

- Verify `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` are set in the build environment.
- The plugin is disabled when `SENTRY_AUTH_TOKEN` is missing; the build still succeeds.

### Stack trace still minified

- Confirm source maps were uploaded (check Sentry **Releases** → your release → **Artifacts**).
- Ensure the release in the event matches the release that has artifacts.
- Allow a few minutes for Sentry to process new artifacts.

---

## 6. Local Development

- **No auth token needed:** `pnpm dev` works without `SENTRY_AUTH_TOKEN`.
- **Release:** Events use `dev-local` when no `SENTRY_RELEASE` / `GIT_SHA` is set.
- **Source maps:** Not uploaded in dev; the plugin skips upload when the token is missing.
