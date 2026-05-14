'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useInvestApp } from '@/lib/investapp-context';
import TransactionLoader from '@/components/TransactionLoader';

export default function TransactionOverlay() {
  const t = useTranslations('Transaction');
  const { loadingTx } = useInvestApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(loadingTx), loadingTx ? 500 : 0);
    return () => {
      clearTimeout(timer);
    };
  }, [loadingTx]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="rounded-3xl border border-white/20 bg-white/10 p-10 text-center text-white shadow-2xl">
        <TransactionLoader />
        <p className="mt-6 text-sm text-white/80">{t('processing')}</p>
      </div>
    </div>
  );
}
