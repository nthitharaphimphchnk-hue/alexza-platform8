#!/usr/bin/env npx tsx
/**
 * Smoke test for webhook delivery.
 * Requires WEBHOOK_TEST_URL env var (e.g. https://webhook.site/xxx or ngrok URL).
 *
 * Usage:
 *   WEBHOOK_TEST_URL=https://your-url.com/webhook pnpm exec tsx scripts/smoke-webhooks.ts
 */

import crypto from "crypto";

const TEST_URL = process.env.WEBHOOK_TEST_URL?.trim();
if (!TEST_URL) {
  console.error("Set WEBHOOK_TEST_URL to a URL that can receive POST requests (e.g. webhook.site)");
  process.exit(1);
}

function computeSignature(secret: string, timestamp: string, rawBody: string): string {
  const payload = `${timestamp}.${rawBody}`;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `sha256=${hmac}`;
}

async function main() {
  const secret = "whsec_smoke_test_" + crypto.randomBytes(8).toString("hex");
  const event = "auth.user.created";
  const payload = {
    userId: "smoke-test-user-id",
    email: "smoke@test.local",
    name: "Smoke Test",
    _smoke: true,
  };
  const rawBody = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const signature = computeSignature(secret, timestamp, rawBody);

  console.log("[Smoke] Sending webhook to", TEST_URL);
  const res = await fetch(TEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Alexza-Event": event,
      "X-Alexza-Timestamp": timestamp,
      "X-Alexza-Signature": signature,
    },
    body: rawBody,
  });

  console.log("[Smoke] Status:", res.status, res.statusText);
  if (!res.ok) {
    const text = await res.text();
    console.error("[Smoke] Response:", text);
    process.exit(1);
  }
  console.log("[Smoke] OK - webhook format validated");
}

main().catch((err) => {
  console.error("[Smoke] Error:", err);
  process.exit(1);
});
