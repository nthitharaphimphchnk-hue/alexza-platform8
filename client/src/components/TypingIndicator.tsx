import { motion } from 'framer-motion';

/**
 * TypingIndicator Component
 * Shows animated dots while waiting for AI response
 * Monochrome metallic theme
 */

export default function TypingIndicator() {
  const dotVariants = {
    hidden: { opacity: 0.5, y: 0 },
    visible: { opacity: 1, y: -10 },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <div className="flex justify-start">
      <motion.div
        className="max-w-md p-4 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <motion.div
          className="flex gap-2 items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-[#c0c0c0]"
            variants={dotVariants}
            animate="visible"
            transition={{
              repeat: Infinity,
              repeatType: 'reverse',
              duration: 0.6,
            }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-[#c0c0c0]"
            variants={dotVariants}
            animate="visible"
            transition={{
              repeat: Infinity,
              repeatType: 'reverse',
              duration: 0.6,
              delay: 0.2,
            }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-[#c0c0c0]"
            variants={dotVariants}
            animate="visible"
            transition={{
              repeat: Infinity,
              repeatType: 'reverse',
              duration: 0.6,
              delay: 0.4,
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
