'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageFrame from '@/components/PageFrame';
import { useInvestApp } from '@/lib/investapp-context';
import { getPendingInvestment } from '@/lib/pending-investment';

function ActionArrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" strokeLinecap="round" />
      <path d="M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type TransferCardProps = {
  title: string;
  description: string;
  gradient: string;
  onClick: () => void;
};

function TransferCard({ title, description, gradient, onClick }: TransferCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[24px] p-5 text-left text-white shadow-[0_18px_40px_rgba(15,23,42,0.14)] transition hover:scale-[1.01]"
      style={{ backgroundImage: gradient }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/70">Transfer</p>
          <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
          <p className="mt-3 max-w-[16rem] text-sm leading-6 text-white/85">{description}</p>
        </div>
        <span className="rounded-full bg-white/20 p-3 text-white">
          <ActionArrow />
        </span>
      </div>
    </button>
  );
}

export default function InvestPage() {
  const router = useRouter();
  const { faseApp } = useInvestApp();
  const [hasPendingInvestment, setHasPendingInvestment] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(getPendingInvestment());
  });

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncPendingInvestment = () => {
      setHasPendingInvestment(Boolean(getPendingInvestment()));
    };

    syncPendingInvestment();
    window.addEventListener('focus', syncPendingInvestment);
    window.addEventListener('storage', syncPendingInvestment);

    return () => {
      window.removeEventListener('focus', syncPendingInvestment);
      window.removeEventListener('storage', syncPendingInvestment);
    };
  }, []);

  useEffect(() => {
    if (!hasPendingInvestment) return;
    router.replace('/invest/wallet');
  }, [hasPendingInvestment, router]);

  if (hasPendingInvestment) {
    return (
      <PageFrame title="Send" subtitle="Preparing your investment transfer">
        <div className="rounded-[20px] border border-white/25 bg-white/20 p-5 text-sm text-[#667085] shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-md">
          Loading your pending investment transfer...
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame title="Send" subtitle="Choose how you want to move funds">
      <div className="space-y-4 pb-8">
        <TransferCard
          title="Send to a Wallet"
          description="Enter a wallet address manually or pick one of your recent contacts."
          gradient="linear-gradient(135deg, #40C4AA 0%, #1EA48D 100%)"
          onClick={() => router.push('/invest/wallet?mode=transfer')}
        />
        <TransferCard
          title="Send repayment"
          description="Review the investors of your business and launch a repayment with prefilled details."
          gradient="linear-gradient(135deg, #FFBE4C 0%, #F59E0B 100%)"
          onClick={() => router.push('/invest/repayments')}
        />
      </div>
    </PageFrame>
  );
}
