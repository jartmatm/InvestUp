export type PaymentScheduleStatus = 'pending' | 'paid' | 'late' | 'partial';

export type PaymentPlanEntry = {
  installment_number: number;
  due_date: string | null;
  fixed_payment: number;
  interest_percent: number;
  interest_amount: number;
  principal_amount: number;
  remaining_balance: number;
  paid_amount: number;
  status: string | null;
  tx_hash: string | null;
};

export type PaymentScheduleRecord = {
  id: string;
  credit_id: string;
  project_id: string;
  investor_user_id: string | null;
  entrepreneur_user_id: string | null;
  annual_interest_rate: number;
  monthly_interest_rate: number;
  installment_count: number;
  current_installment_number: number;
  schedule_start_date: string | null;
  next_due_date: string | null;
  original_principal: number;
  total_paid_amount: number;
  current_installment_amount: number;
  outstanding_balance: number;
  status: string | null;
  tx_hash: string | null;
  payment_plan: PaymentPlanEntry[];
  metadata: Record<string, unknown> | null;
};

export type PaymentScheduleRow = {
  id: string;
  credit_id: string;
  project_id: string;
  investor_user_id: string | null;
  entrepreneur_user_id: string | null;
  installment_number: number;
  installment_count: number;
  due_date: string | null;
  fixed_payment: number;
  interest_percent: number;
  interest_amount: number;
  principal_amount: number;
  remaining_balance: number;
  ending_balance: number;
  paid_amount: number;
  status: string | null;
  tx_hash: string | null;
};

const asNumber = (value: unknown) => Number(value ?? 0);

const asOptionalText = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

const BALANCE_TOLERANCE = 0.02;

const isCloseEnough = (left: number, right: number, tolerance = BALANCE_TOLERANCE) =>
  Math.abs(left - right) <= tolerance;

const normalizePaymentPlanEntry = (value: unknown): PaymentPlanEntry | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;

  return {
    installment_number: asNumber(row.installment_number),
    due_date: asOptionalText(row.due_date),
    fixed_payment: asNumber(row.fixed_payment),
    interest_percent: asNumber(row.interest_percent),
    interest_amount: asNumber(row.interest_amount),
    principal_amount: asNumber(row.principal_amount),
    remaining_balance: asNumber(row.remaining_balance),
    paid_amount: asNumber(row.paid_amount),
    status: asOptionalText(row.status),
    tx_hash: asOptionalText(row.tx_hash),
  };
};

export const normalizePaymentScheduleRecord = (
  row: Record<string, unknown>
): PaymentScheduleRecord => ({
  id: String(row.id ?? ''),
  credit_id: String(row.credit_id ?? ''),
  project_id: String(row.project_id ?? ''),
  investor_user_id: asOptionalText(row.investor_user_id),
  entrepreneur_user_id: asOptionalText(row.entrepreneur_user_id),
  annual_interest_rate: asNumber(row.annual_interest_rate),
  monthly_interest_rate: asNumber(row.monthly_interest_rate),
  installment_count: asNumber(row.installment_count),
  current_installment_number: asNumber(row.current_installment_number),
  schedule_start_date: asOptionalText(row.schedule_start_date),
  next_due_date: asOptionalText(row.next_due_date),
  original_principal: asNumber(row.original_principal),
  total_paid_amount: asNumber(row.total_paid_amount),
  current_installment_amount: asNumber(row.current_installment_amount),
  outstanding_balance: asNumber(row.outstanding_balance),
  status: asOptionalText(row.status),
  tx_hash: asOptionalText(row.tx_hash),
  payment_plan: Array.isArray(row.payment_plan)
    ? row.payment_plan
        .map(normalizePaymentPlanEntry)
        .filter((item): item is PaymentPlanEntry => Boolean(item))
    : [],
  metadata:
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null,
});

export const expandPaymentScheduleRows = (
  record: PaymentScheduleRecord
): PaymentScheduleRow[] => {
  const rowsWithoutEnding = record.payment_plan.map((entry) => ({
    id: `${record.credit_id}:${entry.installment_number}`,
    credit_id: record.credit_id,
    project_id: record.project_id,
    investor_user_id: record.investor_user_id,
    entrepreneur_user_id: record.entrepreneur_user_id,
    installment_number: entry.installment_number,
    installment_count: record.installment_count,
    due_date: entry.due_date,
    fixed_payment: entry.fixed_payment,
    interest_percent: entry.interest_percent,
    interest_amount: entry.interest_amount,
    principal_amount: entry.principal_amount,
    remaining_balance: entry.remaining_balance,
    paid_amount: entry.paid_amount,
    status: entry.status,
    tx_hash: entry.tx_hash,
  }));

  let openingBalanceMatches = 0;
  let endingBalanceMatches = 0;

  for (let index = 0; index < rowsWithoutEnding.length - 1; index += 1) {
    const current = rowsWithoutEnding[index];
    const next = rowsWithoutEnding[index + 1];

    const openingExpectedNext = Math.max(current.remaining_balance - current.principal_amount, 0);
    const endingExpectedNext = Math.max(current.remaining_balance - next.principal_amount, 0);

    if (isCloseEnough(openingExpectedNext, next.remaining_balance)) {
      openingBalanceMatches += 1;
    }

    if (isCloseEnough(endingExpectedNext, next.remaining_balance)) {
      endingBalanceMatches += 1;
    }
  }

  const storesOpeningBalance =
    openingBalanceMatches > 0 && openingBalanceMatches > endingBalanceMatches;

  return rowsWithoutEnding.map((row, index) => {
    const nextRow = rowsWithoutEnding[index + 1];
    const derivedEndingBalance = storesOpeningBalance
      ? nextRow
        ? nextRow.remaining_balance
        : Math.max(row.remaining_balance - row.principal_amount, 0)
      : row.remaining_balance;

    return {
      ...row,
      ending_balance: derivedEndingBalance,
    };
  });
};

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
