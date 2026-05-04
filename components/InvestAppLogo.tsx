'use client';

import { motion } from 'framer-motion';

export default function InvestAppLogo() {
  return (
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="inline-flex items-baseline justify-center font-extrabold leading-none text-[#121827]"
      aria-label="InvestApp"
    >
      <span>Invest</span>
      <span className="text-[#6B39F4]">App</span>
      <span className="ml-1.5 h-3 w-3 rounded-full bg-[#6B39F4]" />
    </motion.div>
  );
}
