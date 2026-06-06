'use client';

import Lottie from 'lottie-react';
import { useTranslations } from 'next-intl';
import transactionSendingAnimation from '@/components/animations/transaction-sending.json';

export default function TransactionLoader() {
  const t = useTranslations('Transaction');

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="h-28 w-56">
        <Lottie animationData={transactionSendingAnimation} loop autoplay />
      </div>
      <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-white/90">
        {t('sending')}...
      </p>
    </div>
  );
}
