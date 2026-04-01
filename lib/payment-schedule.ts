export type PaymentScheduleStatus = 'pending' | 'paid' | 'late' | 'partial';

export type PaymentScheduleRow = {
  id: string;
  credit_id: string;
  investment_id: string;
  project_id: string;
  investor_user_id: string | null;
  entrepreneur_user_id: string | null;
  installment_number: number;
  installment_count: number;
  due_date: string | null;
  fixed_payment: number;
  interest_percent: number;
  principal_amount: number;
  remaining_balance: number;
  paid_amount: number;
  status: string | null;
  tx_hash: string | null;
};

export const normalizePaymentScheduleRow = (
  row: Record<string, unknown>
): PaymentScheduleRow => ({
  id: String(row.id ?? ''),
  credit_id: String(row.credit_id ?? ''),
  investment_id: String(row.investment_id ?? ''),
  project_id: String(row.project_id ?? ''),
  investor_user_id:
    typeof row.investor_user_id === 'string' && row.investor_user_id.trim().length > 0
      ? row.investor_user_id
      : null,
  entrepreneur_user_id:
    typeof row.entrepreneur_user_id === 'string' && row.entrepreneur_user_id.trim().length > 0
      ? row.entrepreneur_user_id
      : null,
  installment_number: Number(row.installment_number ?? 0),
  installment_count: Number(row.installment_count ?? 0),
  due_date: typeof row.due_date === 'string' ? row.due_date : null,
  fixed_payment: Number(row.fixed_payment ?? 0),
  interest_percent: Number(row.interest_percent ?? 0),
  principal_amount: Number(row.principal_amount ?? 0),
  remaining_balance: Number(row.remaining_balance ?? 0),
  paid_amount: Number(row.paid_amount ?? 0),
  status: typeof row.status === 'string' ? row.status : null,
  tx_hash: typeof row.tx_hash === 'string' ? row.tx_hash : null,
});

export const formatPaymentScheduleMoney = (value: number, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

export const formatPaymentScheduleDate = (value: string | null) => {
  if (!value) return 'Pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
};

export const getPaymentScheduleStatusMeta = (status: string | null) => {
  switch (status) {
    case 'paid':
      return {
        label: 'Paid',
        className: 'border-[#40C4AA]/30 bg-[#EFFFF8] text-[#1A8E78]',
      };
    case 'late':
      return {
        label: 'Late',
        className: 'border-[#DF1C41]/20 bg-[#FFF1F3] text-[#B01835]',
      };
    case 'partial':
      return {
        label: 'Partial',
        className: 'border-[#FFBE4C]/30 bg-[#FFF8E9] text-[#B97800]',
      };
    default:
      return {
        label: 'Pending',
        className: 'border-slate-200 bg-slate-50 text-slate-600',
      };
  }
};
