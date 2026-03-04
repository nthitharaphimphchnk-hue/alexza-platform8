/** Fallback when API config is unavailable. Matches backend default. */
export const DEFAULT_CREDIT_PRICE = 0.003;
export const TOKENS_PER_CREDIT = 1000;
export const FREE_CREDITS = 500;

export interface PricingTier {
  name: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

/** Build pricing tiers with dynamic credit price from backend config. */
export function getPricingTiers(creditPrice: number): PricingTier[] {
  return [
    {
      name: "Free",
      description: "Start building with 500 free credits.",
      features: [
        "500 credits included",
        "1 credit = 1,000 tokens",
        "Standard routing",
        "No overage",
        "Community support",
      ],
      cta: "Get Started",
      highlighted: false,
    },
    {
      name: "Pay as you go",
      description: "Only pay for what you use.",
      features: [
        `$${creditPrice.toFixed(3)} per credit`,
        "No subscription",
        "No minimum monthly fee",
        "Real-time wallet balance",
        "Stops automatically when balance reaches zero",
      ],
      cta: "Add Credits",
      highlighted: true,
    },
    {
      name: "Enterprise",
      description: "For high-volume production teams.",
      features: [
        "Volume discounts",
        "Priority routing",
        "Custom limits",
        "SLA support",
        "Dedicated onboarding",
      ],
      cta: "Contact Sales",
      highlighted: false,
    },
  ];
}

/** @deprecated Use getPricingTiers(creditPrice) with config from API. */
export const pricingTiers = getPricingTiers(DEFAULT_CREDIT_PRICE);
