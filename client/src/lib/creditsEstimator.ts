/**
 * Credits Estimator Utility
 * Calculates estimated credits needed for operations based on content size and mode multiplier
 */

export interface EstimationParams {
  content: string;
  modeMultiplier: number;
}

export interface EstimationResult {
  baseCredits: number;
  sizeFactor: number;
  estimatedCredits: number;
  breakdown: string;
}

/**
 * Estimate credits needed for an operation
 * Formula: (base + sizeFactor) * modeMultiplier
 * - base: 2 credits
 * - sizeFactor: ceil(charCount / 500)
 * - modeMultiplier: 1x (Normal), 2x (Pro), 4x (Premium)
 */
export function estimateCredits(params: EstimationParams): EstimationResult {
  const { content, modeMultiplier } = params;

  const BASE_CREDITS = 2;
  const CHAR_PER_UNIT = 500;

  // Calculate size factor
  const charCount = content.length;
  const sizeFactor = Math.ceil(charCount / CHAR_PER_UNIT);

  // Calculate base estimation
  const baseEstimation = BASE_CREDITS + sizeFactor;

  // Apply mode multiplier
  const estimatedCredits = baseEstimation * modeMultiplier;

  const breakdown = `Base: ${BASE_CREDITS} + Size: ${sizeFactor} (${charCount} chars) × Mode: ${modeMultiplier}x = ${estimatedCredits}`;

  return {
    baseCredits: BASE_CREDITS,
    sizeFactor,
    estimatedCredits: Math.ceil(estimatedCredits),
    breakdown,
  };
}

/**
 * Estimate credits for Playground run
 */
export function estimatePlaygroundCredits(
  prompt: string,
  modeMultiplier: number
): EstimationResult {
  return estimateCredits({
    content: prompt,
    modeMultiplier,
  });
}

/**
 * Estimate credits for AI Builder apply/create
 * Fixed small amount: 1 credit * modeMultiplier
 */
export function estimateAIBuilderCredits(modeMultiplier: number): number {
  return 1 * modeMultiplier;
}

/**
 * Format credits for display
 */
export function formatCredits(credits: number): string {
  if (credits >= 1000000) {
    return `${(credits / 1000000).toFixed(1)}M`;
  }
  if (credits >= 1000) {
    return `${(credits / 1000).toFixed(1)}K`;
  }
  return credits.toString();
}

/**
 * Get mode name and multiplier
 */
export function getModeInfo(mode: 'Normal' | 'Pro' | 'Premium'): {
  name: string;
  multiplier: number;
  description: string;
} {
  switch (mode) {
    case 'Normal':
      return {
        name: 'Normal',
        multiplier: 1,
        description: '1x credits cost',
      };
    case 'Pro':
      return {
        name: 'Pro',
        multiplier: 2,
        description: '2x credits cost, 2x faster',
      };
    case 'Premium':
      return {
        name: 'Premium',
        multiplier: 4,
        description: '4x credits cost, 4x faster, priority queue',
      };
    default:
      return {
        name: 'Normal',
        multiplier: 1,
        description: '1x credits cost',
      };
  }
}
