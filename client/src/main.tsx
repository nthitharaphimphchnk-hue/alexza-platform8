import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/config";

const dsn = (import.meta.env.VITE_SENTRY_DSN as string)?.trim();
if (dsn) {
  const environment =
    (import.meta.env.VITE_SENTRY_ENVIRONMENT as string)?.trim() || import.meta.env.MODE || "development";
  const tracesSampleRate = Number.parseFloat(
    (import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string) || "0.1"
  );
  const release =
    (typeof __SENTRY_RELEASE__ !== "undefined" ? __SENTRY_RELEASE__ : null) ||
    (import.meta.env.VITE_SENTRY_RELEASE as string)?.trim() ||
    (import.meta.env.VITE_GIT_SHA as string)?.trim() ||
    "dev-local";

  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: Number.isNaN(tracesSampleRate) ? 0.1 : Math.min(1, Math.max(0, tracesSampleRate)),
  });
}

function loadAnalyticsScript() {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined;
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID as string | undefined;
  if (!endpoint || !websiteId) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = `${endpoint.replace(/\/+$/, "")}/umami`;
  script.setAttribute("data-website-id", websiteId);
  document.body.appendChild(script);
}

loadAnalyticsScript();

createRoot(document.getElementById("root")!).render(
  <App />
);
