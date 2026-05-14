import { useTranslations } from 'next-intl';

type BalanceCardProps = {
  balanceUSDC: string;
};

export default function BalanceCard({ balanceUSDC }: BalanceCardProps) {
  const t = useTranslations('Components');

  return (
    <section className="glass-card mb-6 rounded-xl p-5">
      <p className="text-sm text-gray-500">{t('totalBalance')}</p>
      <h2 className="text-3xl font-semibold text-gray-900">${balanceUSDC}</h2>
      <p className="mt-2 text-xs text-gray-500">{t('availableToSend')}</p>
    </section>
  );
}
