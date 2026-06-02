'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  formatPaymentScheduleDate,
  formatPaymentScheduleMoney,
  getPaymentScheduleStatusMeta,
  type PaymentScheduleRow,
} from '@/lib/payment-schedule';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from '@/components/tailgrids/core/table';

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
    <TableRoot className="min-w-full border-slate-200/80 bg-white/70 text-sm">
      <TableHeader>
        <TableRow className="text-xs uppercase text-slate-400">
          <TableHead className="px-3 py-3 font-semibold">{t('month')}</TableHead>
          <TableHead className="px-3 py-3 font-semibold">{t('fixedPayment')}</TableHead>
          <TableHead className="px-3 py-3 font-semibold">{t('interest')} $</TableHead>
          <TableHead className="px-3 py-3 font-semibold">{t('principalPayment')}</TableHead>
          <TableHead className="px-3 py-3 font-semibold">{t('endingBalance')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
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
            <TableRow key={row.id} className="text-slate-700">
              <TableCell className="px-3 py-4 align-top">
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
              </TableCell>
              <TableCell className="px-3 py-4 font-medium text-slate-900">
                {formatPaymentScheduleMoney(row.fixed_payment, currency, locale)}
              </TableCell>
              <TableCell className="px-3 py-4">
                {formatPaymentScheduleMoney(row.interest_amount, currency, locale)}
              </TableCell>
              <TableCell className="px-3 py-4">
                {formatPaymentScheduleMoney(row.principal_amount, currency, locale)}
              </TableCell>
              <TableCell className="px-3 py-4">
                {formatPaymentScheduleMoney(row.ending_balance, currency, locale)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </TableRoot>
  );
}
