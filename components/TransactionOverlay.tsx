'use client';

import { useEffect, useState } from 'react';
import { useInvestApp } from '@/lib/investapp-context';
import TransactionLoader from '@/components/TransactionLoader';

export default function TransactionOverlay() {
  const { loadingTx } = useInvestApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (loadingTx) {
      timer = setTimeout(() => setVisible(true), 500);
    } else {
      setVisible(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loadingTx]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="rounded-3xl border border-white/20 bg-white/10 p-10 text-center text-white shadow-2xl">
        <TransactionLoader />
        <p className="mt-6 text-sm text-white/80">Procesando transaccion...</p>
      </div>
    </div>
  );
}
