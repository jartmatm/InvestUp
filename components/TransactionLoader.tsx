'use client';

import { useTranslations } from 'next-intl';

export default function TransactionLoader() {
  const t = useTranslations('Transaction');
  const label = `${t('sending')}...`;

  return (
    <div className="tx-loader-wrapper">
      {[...label].map((letter, index) => (
        <span key={`${letter}-${index}`} className="tx-loader-letter">
          {letter}
        </span>
      ))}
      <div className="tx-loader" />
    </div>
  );
}
