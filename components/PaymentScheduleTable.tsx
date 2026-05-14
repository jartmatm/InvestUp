'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  formatPaymentScheduleDate,
  formatPaymentScheduleMoney,
  getPaymentScheduleStatusMeta,
  type PaymentScheduleRow,
} from '@/lib/payment-schedule';

export default function PaymentScheduleTable({
  rows,
  currency = 'USD',
}: {
  rows: PaymentScheduleRow[];
  currency?: string;
}) {
  const t = useTranslations('Tables');
  const locale = useLocale();

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200/80 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-slate-400">
            <th className="px-3 py-3 font-semibold">{t('month')}</th>
            <th className="px-3 py-3 font-semibold">{t('fixedPayment')}</th>
            <th className="px-3 py-3 font-semibold">{t('interest')} $</th>
            <th className="px-3 py-3 font-semibold">{t('principalPayment')}</th>
            <th className="px-3 py-3 font-semibold">{t('endingBalance')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/80">
          {rows.map((row) => {
            const statusMeta = getPaymentScheduleStatusMeta(row.status);
            const statusLabel =
              statusMeta.labelKey === 'paid'
                ? t('paid')
                : statusMeta.labelKey === 'late'
                  ? t('late')
                  : statusMeta.labelKey === 'partial'
                    ? t('partial')
                    : t('pending');
            return (
              <tr key={row.id} className="text-slate-700">
                <td className="px-3 py-4 align-top">
                  <div className="font-semibold text-slate-900">
                    {t('monthNumber', { number: row.installment_number })}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {t('dueDate', {
                      date: formatPaymentScheduleDate(row.due_date, locale, t('pending')),
                    })}
                  </div>
                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                  >
                    {statusLabel}
                  </span>
                </td>
                <td className="px-3 py-4 font-medium text-slate-900">
                  {formatPaymentScheduleMoney(row.fixed_payment, currency, locale)}
                </td>
                <td className="px-3 py-4">
                  {formatPaymentScheduleMoney(row.interest_amount, currency, locale)}
                </td>
                <td className="px-3 py-4">
                  {formatPaymentScheduleMoney(row.principal_amount, currency, locale)}
                </td>
                <td className="px-3 py-4">
                  {formatPaymentScheduleMoney(row.ending_balance, currency, locale)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
