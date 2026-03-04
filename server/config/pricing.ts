/**
 * Volume discount pricing - tier-based credit pricing.
 * Tiers are sorted by minCredits ascending. First matching tier applies.
 */

export interface CreditPriceTier {
  minCredits: number;
  price: number;
}

/** Volume discount tiers. Sorted by minCredits. */
export const CREDIT_PRICE_TIERS: CreditPriceTier[] = [
  { minCredits: 0, price: 0.003 },
  { minCredits: 10_000, price: 0.0027 },
  { minCredits: 100_000, price: 0.0024 },
];

/**
 * Get the price per credit for a given amount.
 * Returns the tier price that applies (tier where minCredits <= credits).
 */
export function getCreditPriceForAmount(credits: number): number {
  if (!Number.isFinite(credits) || credits < 0) return CREDIT_PRICE_TIERS[0]!.price;
  const sorted = [...CREDIT_PRICE_TIERS].sort((a, b) => b.minCredits - a.minCredits);
  for (const tier of sorted) {
    if (credits >= tier.minCredits) return tier.price;
  }
  return CREDIT_PRICE_TIERS[0]!.price;
}

/**
 * Calculate total USD for a given number of credits using tier pricing.
 */
export function getUsdForCredits(credits: number): number {
  if (!Number.isFinite(credits) || credits <= 0) return 0;
  const sorted = [...CREDIT_PRICE_TIERS].sort((a, b) => a.minCredits - b.minCredits);
  let total = 0;
  let remaining = credits;

  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i]!;
    const nextMin = i + 1 < sorted.length ? sorted[i + 1]!.minCredits : Infinity;
    const tierCredits = Math.min(remaining, nextMin - tier.minCredits);
    if (tierCredits <= 0) continue;
    total += tierCredits * tier.price;
    remaining -= tierCredits;
    if (remaining <= 0) break;
  }

  return total;
}

/**
 * Calculate credits received for a given USD amount using tier pricing.
 * Inverse of getUsdForCredits - iteratively fills tiers until budget exhausted.
 */
export function getCreditsForUsd(amountUsd: number): number {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return 0;
  const sorted = [...CREDIT_PRICE_TIERS].sort((a, b) => a.minCredits - b.minCredits);
  let credits = 0;
  let remaining = amountUsd;

  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i]!;
    const nextMin = i + 1 < sorted.length ? sorted[i + 1]!.minCredits : Infinity;
    const tierCredits = nextMin - tier.minCredits;
    const tierCost = tierCredits * tier.price;

    if (remaining >= tierCost) {
      credits += tierCredits;
      remaining -= tierCost;
    } else {
      credits += Math.floor(remaining / tier.price + 1e-9);
      remaining = 0;
      break;
    }
  }

  if (remaining > 0 && sorted.length > 0) {
    const lastTier = sorted[sorted.length - 1]!;
    credits += Math.floor(remaining / lastTier.price + 1e-9);
  }

  return Math.max(1, credits);
}
