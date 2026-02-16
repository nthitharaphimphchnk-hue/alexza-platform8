import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";

/**
 * ALEXZA AI Pricing Page
 * 7-day free trial + pay-as-you-go credits model
 */

export default function Pricing() {
  const plans = [
    {
      name: "Free Trial",
      description: "Get started with ALEXZA AI",
      duration: "7 days",
      features: [
        "Full platform access",
        "5,000 free credits",
        "All AI features",
        "Community support",
        "Basic analytics",
      ],
      cta: "Start Free Trial",
      highlighted: true,
    },
    {
      name: "Pay-as-you-go",
      description: "Scale as you grow",
      duration: "Usage-based",
      features: [
        "Unlimited usage",
        "Flexible credit packages",
        "Priority support",
        "Advanced analytics",
        "Custom integrations",
        "Dedicated account manager",
      ],
      cta: "Get Started",
      highlighted: false,
    },
  ];

  const creditPackages = [
    { credits: "10,000", price: "$50", perCredit: "$0.005" },
    { credits: "50,000", price: "$200", perCredit: "$0.004" },
    { credits: "100,000", price: "$350", perCredit: "$0.0035" },
    { credits: "500,000", price: "$1,500", perCredit: "$0.003" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground">
      {/* Header */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-4xl mx-auto text-center space-y-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h1
            className="text-5xl md:text-6xl font-bold text-white"
            variants={itemVariants}
          >
            Simple, Transparent Pricing
          </motion.h1>
          <motion.p
            className="text-xl text-gray-300"
            variants={itemVariants}
          >
            Start free, scale as you grow. Pay only for what you use.
          </motion.p>
        </motion.div>
      </div>

      {/* Plans */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8"
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {plans.map((plan, idx) => (
            <motion.div
              key={idx}
              className={`p-8 rounded-2xl border transition-all ${
                plan.highlighted
                  ? "bg-gradient-to-br from-[#0b0e12] to-[#050607] border-[#c0c0c0]/30 shadow-lg shadow-[#c0c0c0]/10"
                  : "bg-gradient-to-br from-[#0b0e12] to-[#050607] border-[rgba(255,255,255,0.06)]"
              }`}
              variants={staggerItemVariants}
              whileHover={{ scale: 1.02 }}
            >
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  <p className="text-gray-400 mt-2">{plan.description}</p>
                  <p className="text-sm text-gray-500 mt-2">{plan.duration}</p>
                </div>

                <div className="space-y-4">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Check size={20} className="text-[#c0c0c0] flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className={`w-full h-12 font-semibold ${
                    plan.highlighted
                      ? "bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black"
                      : "bg-transparent border border-[#c0c0c0] text-white hover:bg-[#c0c0c0]/10"
                  }`}
                >
                  {plan.cta}
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Credit Packages */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0b0e12]/50">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-4xl font-bold text-white text-center mb-16"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            Credit Packages
          </motion.h2>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {creditPackages.map((pkg, idx) => (
              <motion.div
                key={idx}
                className="p-6 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all"
                variants={staggerItemVariants}
                whileHover={{ scale: 1.05 }}
              >
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm">Credits</p>
                    <p className="text-3xl font-bold text-white">{pkg.credits}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{pkg.price}</p>
                    <p className="text-xs text-gray-500">{pkg.perCredit} per credit</p>
                  </div>
                  <Button className="w-full bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold">
                    Buy Credits
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            className="text-4xl font-bold text-white text-center mb-16"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            Frequently Asked Questions
          </motion.h2>

          <motion.div
            className="space-y-6"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {[
              {
                q: "How do credits work?",
                a: "Each API call consumes credits based on complexity. You can monitor usage in real-time.",
              },
              {
                q: "Can I upgrade during my trial?",
                a: "Yes, upgrade anytime. Your trial credits will be credited toward your purchase.",
              },
              {
                q: "What happens when I run out of credits?",
                a: "Your requests will be paused. You can instantly buy more credits to resume.",
              },
              {
                q: "Do credits expire?",
                a: "No, credits never expire. Use them at your own pace.",
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                className="p-6 rounded-xl bg-[#0b0e12]/50 border border-[rgba(255,255,255,0.06)]"
                variants={staggerItemVariants}
              >
                <h3 className="text-lg font-semibold text-white mb-3">{item.q}</h3>
                <p className="text-gray-400">{item.a}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-2xl mx-auto text-center space-y-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold text-white">Ready to get started?</h2>
          <p className="text-xl text-gray-300">
            Join thousands of teams using ALEXZA AI to orchestrate their AI systems.
          </p>
          <Button className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black h-12 px-8 text-base font-semibold inline-flex items-center gap-2">
            Start Free Trial <ArrowRight size={18} />
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
