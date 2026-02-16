import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";

export default function BillingPlans() {
  const plans = [
    {
      name: "Starter",
      description: "Perfect for getting started",
      price: "Free",
      credits: "1,000 credits/month",
      features: [
        "Up to 1,000 API calls/month",
        "Basic support",
        "Single project",
        "Community access",
      ],
    },
    {
      name: "Professional",
      description: "For growing projects",
      price: "$50",
      period: "/month",
      credits: "50,000 credits/month",
      features: [
        "Up to 50,000 API calls/month",
        "Priority support",
        "Unlimited projects",
        "Advanced analytics",
        "Custom integrations",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      description: "For large-scale operations",
      price: "Custom",
      credits: "Custom credits",
      features: [
        "Unlimited API calls",
        "24/7 dedicated support",
        "Unlimited projects",
        "Advanced security",
        "SLA guarantee",
        "Custom integrations",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] p-8">
        <motion.div
          className="max-w-7xl mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl font-bold text-white">Billing Plans</h1>
            <p className="text-gray-400 mt-2">Choose the perfect plan for your needs</p>
          </motion.div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-8">
        <motion.div
          className="max-w-7xl mx-auto"
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Plans Grid */}
          <motion.div className="grid md:grid-cols-3 gap-8" variants={staggerItemVariants}>
            {plans.map((plan, idx) => (
              <motion.div
                key={idx}
                className={`p-8 rounded-xl border transition ${
                  plan.popular
                    ? "bg-gradient-to-br from-[#0b0e12] to-[#050607] border-[#c0c0c0]/30 ring-2 ring-[#c0c0c0]/20"
                    : "bg-gradient-to-br from-[#0b0e12] to-[#050607] border-[rgba(255,255,255,0.06)]"
                }`}
                variants={staggerItemVariants}
              >
                {plan.popular && (
                  <div className="mb-4 inline-block px-3 py-1 rounded-full bg-[#c0c0c0]/20 text-[#c0c0c0] text-xs font-semibold">
                    Popular
                  </div>
                )}

                <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                <p className="text-gray-500 text-sm mt-2">{plan.description}</p>

                <div className="mt-6 mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    {plan.period && <span className="text-gray-500">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{plan.credits}</p>
                </div>

                <Button
                  className={`w-full mb-8 font-semibold ${
                    plan.popular
                      ? "bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black"
                      : "border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]"
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.popular ? "Get Started" : "Choose Plan"}
                </Button>

                <div className="space-y-4">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check size={18} className="text-[#c0c0c0] flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* FAQ */}
          <motion.div className="mt-16 max-w-3xl mx-auto" variants={staggerItemVariants}>
            <h2 className="text-2xl font-bold text-white mb-8">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              {[
                {
                  q: "Can I change plans anytime?",
                  a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.",
                },
                {
                  q: "What happens if I exceed my credits?",
                  a: "We'll notify you when you're approaching your limit. You can upgrade anytime or purchase additional credits.",
                },
                {
                  q: "Do you offer annual billing?",
                  a: "Yes, annual billing is available for all paid plans with a 20% discount.",
                },
              ].map((faq, i) => (
                <div key={i} className="p-6 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)]">
                  <h4 className="font-semibold text-white">{faq.q}</h4>
                  <p className="text-gray-400 text-sm mt-2">{faq.a}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
