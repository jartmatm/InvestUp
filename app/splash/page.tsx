'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import InvestUpLogo from '@/components/InvestUpLogo';
import ParticleBackground from '@/components/ParticleBackground';
import { useInvestUp } from '@/lib/investup-context';

export default function SplashPage() {
  const router = useRouter();
  const { faseApp } = useInvestUp();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (faseApp === 'dashboard') {
        router.push('/home');
        return;
      }
      if (faseApp === 'onboarding') {
        router.push('/onboarding');
        return;
      }
      router.push('/login');
    }, 3500);

    return () => clearTimeout(timer);
  }, [faseApp, router]);

  return (
    <main className="relative flex h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-violet-600 to-teal-400" />

      <div className="absolute inset-0">
        <ParticleBackground />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        <InvestUpLogo />

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="text-4xl font-bold tracking-wide text-white"
        >
          InvestUp
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-sm text-white/85"
        >
          Invirtiendo en el futuro
        </motion.p>
      </div>
    </main>
  );
}
