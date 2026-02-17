import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/config";

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
