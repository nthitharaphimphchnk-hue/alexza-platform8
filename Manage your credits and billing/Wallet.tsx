import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";

/**
 * ALEXZA AI Credits & Wallet
 * Manage your credits and billing
 * 
 * Design: Monochrome metallic theme
 * - Primary color: #c0c0c0 (metallic silver)
 * - Background: #050607 (near black)
 * - Surfaces: #0b0e12 (dark graphite)
 * - Text: white with opacity hierarchy
 */

export default function Wallet() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] p-8">
        <motion.div
          className="max-w-7xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl font-bold text-white">Credits & Wallet</h1>
            <p className="text-gray-400 mt-2">Manage your credits and billing</p>
          </motion.div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-8">
        <motion.div
          className="max-w-7xl mx-auto space-y-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Main content section */}
          <motion.div
            className="p-8 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]"
            variants={itemVariants}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Content Section</h2>
            <p className="text-gray-300">Add your content here</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
