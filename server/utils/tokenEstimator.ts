/**
 * Token estimation and credit calculation for mode-based pricing.
 * No provider/model exposure.
 */

export type RoutingMode = "cheap" | "balanced" | "quality";

/**
 * Estimate tokens from input.
 * - If input is string → use directly
 * - If object → JSON.stringify(input)
 * - tokens = ceil(length / 4)
 * - minimum 1 token
 */
export function estimateTokensFromInput(input: unknown): number {
  let text: string;
  if (typeof input === "string") {
    text = input;
  } else if (input !== null && typeof input === "object") {
    text = JSON.stringify(input);
  } else {
    text = String(input ?? "");
  }
  const estimated = Math.ceil(text.length / 4);
  return Math.max(1, estimated);
}

/**
 * Calculate credits from mode and token count.
 * Cheap     = ceil(tokens / 800)
 * Balanced  = ceil(tokens / 600)
 * Quality  = ceil(tokens / 400)
 * Minimum 1 credit.
 */
export function calculateCredits(
  mode: RoutingMode,
  tokens: number
): number {
  const divisor =
    mode === "cheap" ? 800 : mode === "balanced" ? 600 : 400;
  const credits = Math.ceil(tokens / divisor);
  return Math.max(1, credits);
}
