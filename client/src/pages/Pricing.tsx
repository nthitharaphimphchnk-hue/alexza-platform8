import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import {
  containerVariants,
  itemVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/animations";
import Logo from "@/components/Logo";
import {
  pricingTiers,
  CREDIT_PRICE,
  FREE_CREDITS,
  TOKENS_PER_CREDIT,
} from "@/config/pricing";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function creditsFromDollars(dollars: number): number {
  return Math.floor(dollars / CREDIT_PRICE);
}

export default function Pricing() {
  const walletExamples = [
    { dollars: 10, credits: creditsFromDollars(10) },
    { dollars: 20, credits: creditsFromDollars(20) },
    { dollars: 50, credits: creditsFromDollars(50) },
  ];

  const handleCta = (cta: string) => {
    if (cta === "Get Started") window.location.href = "/signup";
    else if (cta === "Add Credits") window.location.href = "/app/billing/credits";
    else if (cta === "Contact Sales") window.location.href = "mailto:sales@alexza.ai";
  };

  return (
    <div className="min-h-screen text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050607]/80 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Logo size="navbar" />
          <div className="flex items-center gap-4">
            <a href="/docs" className="text-sm text-gray-300 hover:text-white transition">
              Docs
            </a>
            <a href="/" className="text-sm text-gray-300 hover:text-white transition">
              Home
            </a>
            <a href="/pricing" className="text-sm text-gray-300 hover:text-white transition">
              Pricing
            </a>
            <Button
              variant="outline"
              className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[#0b0e12]"
              onClick={() => (window.location.href = "/login")}
            >
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-4xl mx-auto text-center space-y-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h1 className="text-5xl md:text-6xl font-bold text-white" variants={itemVariants}>
            Simple, Transparent Pricing
          </motion.h1>
          <motion.p className="text-xl text-gray-300" variants={itemVariants}>
            Pay only for what you use. No subscription. No surprises.
          </motion.p>
        </motion.div>
      </div>

      {/* Pricing Cards */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {pricingTiers.map((tier, idx) => (
            <motion.div
              key={idx}
              className={`p-8 rounded-2xl border transition-all ${
                tier.highlighted
                  ? "bg-gradient-to-br from-[#0b0e12] to-[#050607] border-[#c0c0c0]/30 shadow-lg shadow-[#c0c0c0]/10 ring-2 ring-[#c0c0c0]/20"
                  : "bg-gradient-to-br from-[#0b0e12] to-[#050607] border-[rgba(255,255,255,0.06)]"
              }`}
              variants={staggerItemVariants}
              whileHover={{ scale: 1.02 }}
            >
              <div className="space-y-6">
                <div>
                  {tier.highlighted && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#c0c0c0]/20 text-[#c0c0c0] mb-3">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
                  <p className="text-gray-400 mt-2">{tier.description}</p>
                </div>

                <div className="space-y-4">
                  {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check size={20} className="text-[#c0c0c0] flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className={`w-full h-12 font-semibold ${
                    tier.highlighted
                      ? "bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black"
                      : "bg-transparent border border-[#c0c0c0] text-white hover:bg-[#c0c0c0]/10"
                  }`}
                  onClick={() => handleCta(tier.cta)}
                >
                  {tier.cta}
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Wallet Example */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-2xl font-bold text-white text-center mb-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            Wallet Example
          </motion.h2>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {walletExamples.map((ex, idx) => (
              <motion.div
                key={idx}
                className="p-6 rounded-xl bg-[#0b0e12]/50 border border-[rgba(255,255,255,0.06)] text-center"
                variants={staggerItemVariants}
              >
                <p className="text-2xl font-bold text-white">${ex.dollars}</p>
                <p className="text-gray-400 text-sm mt-1">≈ {ex.credits.toLocaleString()} credits</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How Billing Works */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-[#0b0e12]/30">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            className="text-3xl font-bold text-white text-center mb-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            How Billing Works
          </motion.h2>
          <motion.ul
            className="space-y-4 text-gray-300"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              "Add funds to your wallet",
              "Credits are deducted per API call",
              `1 credit = ${TOKENS_PER_CREDIT.toLocaleString()} tokens`,
              `$${CREDIT_PRICE.toFixed(3)} per credit`,
              "API stops automatically when balance reaches zero",
            ].map((item, i) => (
              <motion.li key={i} className="flex items-center gap-3" variants={staggerItemVariants}>
                <Check size={18} className="text-[#c0c0c0] flex-shrink-0" />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            className="text-3xl font-bold text-white text-center mb-12"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            Frequently Asked Questions
          </motion.h2>

          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem
                value="expire"
                className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12]/50 px-6"
              >
                <AccordionTrigger className="text-white hover:no-underline hover:text-gray-300 py-6">
                  Do credits expire?
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 pb-6">
                  No. Paid credits do not expire.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem
                value="zero"
                className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12]/50 px-6"
              >
                <AccordionTrigger className="text-white hover:no-underline hover:text-gray-300 py-6">
                  What happens when my balance is zero?
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 pb-6">
                  API requests will return an insufficient balance error.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem
                value="subscription"
                className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12]/50 px-6"
              >
                <AccordionTrigger className="text-white hover:no-underline hover:text-gray-300 py-6">
                  Do you offer subscriptions?
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 pb-6">
                  No. ALEXZA uses a prepaid wallet model.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-2xl mx-auto text-center space-y-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold text-white">Ready to get started?</h2>
          <p className="text-xl text-gray-300">
            New users receive {FREE_CREDITS.toLocaleString()} free credits. No credit card required.
          </p>
          <Button
            className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black h-12 px-8 text-base font-semibold"
            onClick={() => (window.location.href = "/signup")}
          >
            Get Started Free
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
