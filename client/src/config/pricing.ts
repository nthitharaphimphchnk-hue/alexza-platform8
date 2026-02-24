export const CREDIT_PRICE = 0.003;
export const TOKENS_PER_CREDIT = 1000;
export const FREE_CREDITS = 500;

export const pricingTiers = [
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
      "$0.003 per credit",
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
