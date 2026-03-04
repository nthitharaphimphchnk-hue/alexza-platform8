/**
 * Webhook signature - HMAC-SHA256 for verification.
 * Format: HMAC-SHA256(secret, timestamp + "." + rawBody)
 */

import crypto from "crypto";

/**
 * Compute X-Alexza-Signature header value.
 * @param secret - Webhook endpoint secret
 * @param timestamp - Unix timestamp in ms (string)
 * @param rawBody - Raw JSON body string
 */
export function computeWebhookSignature(secret: string, timestamp: string, rawBody: string): string {
  const payload = `${timestamp}.${rawBody}`;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `sha256=${hmac}`;
}

/**
 * Verify incoming webhook signature.
 * @param secret - Webhook endpoint secret
 * @param signature - X-Alexza-Signature header value
 * @param timestamp - X-Alexza-Timestamp header value
 * @param rawBody - Raw JSON body string
 */
export function verifyWebhookSignature(
  secret: string,
  signature: string,
  timestamp: string,
  rawBody: string
): boolean {
  const expected = computeWebhookSignature(secret, timestamp, rawBody);
  return crypto.timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"));
}
