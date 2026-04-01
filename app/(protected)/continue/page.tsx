'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useInvestApp } from '@/lib/investapp-context';

export default function ContinuePage() {
  const router = useRouter();
  const { faseApp } = useInvestApp();

  useEffect(() => {
    if (faseApp === 'dashboard') {
      router.replace('/home');
      return;
    }

    if (faseApp === 'onboarding') {
      router.replace('/onboarding');
      return;
    }

    if (faseApp === 'login') {
      router.replace('/login');
    }
  }, [faseApp, router]);

  return <main className="min-h-screen bg-transparent" />;
}
