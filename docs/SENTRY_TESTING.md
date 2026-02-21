# Sentry Monitoring & Testing Guide

This document explains how to configure and test Sentry monitoring
for both Backend (Node/Express) and Frontend (React).

---

## 1. Overview

Alexza AI uses Sentry for:

- Backend error tracking (Express)
- Frontend error tracking (React)
- Slow request detection
- Production monitoring

Sentry is enabled via environment variables.

---

## 2. Required Environment Variables

### Backend (.env.local or Render)

```
SENTRY_DSN=YOUR_BACKEND_DSN
```

### Frontend (.env.local or Render)

```
VITE_SENTRY_DSN=YOUR_FRONTEND_DSN
```

After updating environment variables:

```
Ctrl + C
pnpm dev
```

Or redeploy on Render.

---

## 3. Backend Test (Development Only)

### Endpoint

```
GET /api/debug/sentry-error
```

### How to trigger

Open in browser:

```
http://localhost:3002/api/debug/sentry-error
```

Expected result:

- HTTP 500
- requestId in response
- New issue appears in Sentry Backend project

### Production behavior

In production, this route returns 404.

---

## 4. Frontend Test (Development Only)

A dev-only button appears:

```
Test Sentry Frontend
```

Located at bottom-right of the app (when in development mode).

### When clicked:

- Throws error: "Sentry Frontend Test Error"
- ErrorBoundary fallback appears
- New issue appears in Sentry Frontend project

### Production behavior

Button is not rendered in production builds.

---

## 5. Verifying Errors in Sentry

1. Open Sentry dashboard
2. Select correct project:
   - Backend → Node project
   - Frontend → React project
3. Go to "Issues"
4. Confirm new error appears

---

## 6. Recommended Alerts (Production)

After confirming Sentry works, configure alerts:

### A) Error Spike Alert
- Condition: error rate increases significantly
- Notify: Email or Slack

### B) New Issue Alert
- Condition: new issue created
- Notify immediately

### C) Slow Request Alert (Optional)
If latency > threshold (e.g. 2000ms)

---

## 7. Security Notes

- Do NOT expose DSN publicly outside env files.
- Do NOT log secrets.
- Do NOT log provider/model names (Hidden Gateway policy).

---

## 8. Troubleshooting

If errors do not appear:

- Verify SENTRY_DSN / VITE_SENTRY_DSN is correct
- Restart server after updating env
- Ensure correct Sentry project is selected
- Check browser console for initialization errors

---

Monitoring is now production-ready when both backend and frontend
errors are confirmed in Sentry.
