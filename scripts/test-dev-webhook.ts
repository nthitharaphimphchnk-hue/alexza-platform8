/**
 * Test the dev webhook endpoint - sends POST to /api/dev/test-webhook
 * Run: pnpm exec tsx scripts/test-dev-webhook.ts
 * Ensure pnpm dev is running first.
 * Use PORT=3006 if the default is in use: PORT=3006 pnpm exec tsx scripts/test-dev-webhook.ts
 */

const port = process.env.PORT || "3005";
const url = `http://localhost:${port}/api/dev/test-webhook`;

async function testWebhook() {
  try {
    const res = await fetch(url, {
      method: "POST",
    });

    const text = await res.text();

    console.log("Status:", res.status);
    console.log("Response:", text);

    if (res.ok) {
      console.log("\nWebhook test sent successfully. Check webhook.site to confirm delivery.");
    } else {
      console.error("\nWebhook test failed.");
    }
  } catch (err) {
    console.error("Webhook test failed:", err);
    process.exit(1);
  }
}

testWebhook();
