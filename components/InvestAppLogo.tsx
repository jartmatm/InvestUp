'use client';

import { motion } from 'framer-motion';

export default function InvestAppLogo() {
  return (
    <motion.img
      src="/logo.png"
      alt="InvestApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
      }}
      transition={{
        duration: 1.2,
        ease: 'easeOut',
      }}
      className="w-44 rounded-2xl drop-shadow-[0_0_40px_rgba(62,207,142,0.55)]"
    />
  );
}
