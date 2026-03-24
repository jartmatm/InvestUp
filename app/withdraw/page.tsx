'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import PageFrame from '@/components/PageFrame';
import { useInvestUp } from '@/lib/investup-context';

export default function WithdrawPage() {
  const router = useRouter();
  const { faseApp, abrirRetiro } = useInvestUp();

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <PageFrame title="Withdraw funds" subtitle="Fiat payout from USDC">
      <div className="rounded-xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
        <p className="text-sm text-slate-600">Quick access to the withdrawal widget for your current wallet.</p>
        <div className="mt-4">
          <Button onClick={abrirRetiro}>Open withdrawal</Button>
        </div>
      </div>
    </PageFrame>
  );
}

