'use client';

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
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200/80 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-slate-400">
            <th className="px-3 py-3 font-semibold">Month</th>
            <th className="px-3 py-3 font-semibold">Fixed payment</th>
            <th className="px-3 py-3 font-semibold">Interest (%)</th>
            <th className="px-3 py-3 font-semibold">Principal payment</th>
            <th className="px-3 py-3 font-semibold">Ending balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/80">
          {rows.map((row) => {
            const statusMeta = getPaymentScheduleStatusMeta(row.status);
            return (
              <tr key={row.id} className="text-slate-700">
                <td className="px-3 py-4 align-top">
                  <div className="font-semibold text-slate-900">Month {row.installment_number}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Due {formatPaymentScheduleDate(row.due_date)}
                  </div>
                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                  >
                    {statusMeta.label}
                  </span>
                </td>
                <td className="px-3 py-4 font-medium text-slate-900">
                  {formatPaymentScheduleMoney(row.fixed_payment, currency)}
                </td>
                <td className="px-3 py-4">{row.interest_percent.toFixed(2)}%</td>
                <td className="px-3 py-4">
                  {formatPaymentScheduleMoney(row.principal_amount, currency)}
                </td>
                <td className="px-3 py-4">
                  {formatPaymentScheduleMoney(row.ending_balance, currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
