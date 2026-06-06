'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Toast } from '@/components/tailgrids/core/toast';
import { useInvestApp } from '@/lib/investapp-context';
import TransactionLoader from '@/components/TransactionLoader';

export default function TransactionOverlay() {
  const t = useTranslations('Transaction');
  const { loadingTx, transactionToast, clearTransactionToast } = useInvestApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(loadingTx), loadingTx ? 500 : 0);
    return () => {
      clearTimeout(timer);
    };
  }, [loadingTx]);

  useEffect(() => {
    if (!transactionToast) return;
    const timer = window.setTimeout(() => clearTransactionToast(), 4200);
    return () => window.clearTimeout(timer);
  }, [clearTransactionToast, transactionToast]);

  return (
    <>
      {visible ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="rounded-3xl border border-white/20 bg-white/10 p-10 text-center text-white shadow-2xl">
            <TransactionLoader />
            <p className="mt-6 text-sm text-white/80">{t('processing')}</p>
          </div>
        </div>
      ) : null}

      {transactionToast ? (
        <div className="fixed inset-x-4 top-4 z-[60] flex justify-center lg:inset-x-auto lg:right-6 lg:top-20">
          <Toast message={transactionToast.message} variant={transactionToast.variant} />
        </div>
      ) : null}
    </>
  );
}
