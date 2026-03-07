/**
 * Public pricing API - volume discount tiers.
 */

import { apiRequest } from "@/lib/api";

export interface PricingTier {
  minCredits: number;
  price: number;
}

export interface PublicPricingResponse {
  ok: boolean;
  tiers: PricingTier[];
}

export async function fetchPublicPricing(): Promise<PublicPricingResponse> {
  return apiRequest<PublicPricingResponse>("/api/public/pricing");
}

/**
 * Calculate credits for a given USD amount using tier pricing.
 * Mirrors server logic for client-side display.
 */
export function getCreditsForUsd(amountUsd: number, tiers: PricingTier[]): number {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0 || tiers.length === 0) return 0;
  const sorted = [...tiers].sort((a, b) => a.minCredits - b.minCredits);
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

/**
 * Calculate total USD for a given number of credits using tier pricing.
 * Mirrors server logic for client-side cost estimation.
 */
export function getUsdForCredits(credits: number, tiers: PricingTier[]): number {
  if (!Number.isFinite(credits) || credits <= 0 || tiers.length === 0) return 0;
  const sorted = [...tiers].sort((a, b) => a.minCredits - b.minCredits);
  let total = 0;
  let remaining = credits;

  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i]!;
    const nextMin = i + 1 < sorted.length ? sorted[i + 1]!.minCredits : Infinity;
    const tierCredits = Math.min(remaining, Math.max(0, nextMin - tier.minCredits));
    if (tierCredits <= 0) continue;
    total += tierCredits * tier.price;
    remaining -= tierCredits;
    if (remaining <= 0) break;
  }

  if (remaining > 0 && sorted.length > 0) {
    const lastTier = sorted[sorted.length - 1]!;
    total += remaining * lastTier.price;
  }

  return total;
}
