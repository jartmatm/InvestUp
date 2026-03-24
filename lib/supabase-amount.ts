import type { PostgrestError } from '@supabase/supabase-js';

export type AmountColumn = 'amount' | 'amount_usdc';

const AMOUNT_COLUMNS: AmountColumn[] = ['amount', 'amount_usdc'];

const getErrorText = (error: PostgrestError | null) =>
  `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();

const isMissingAmountColumn = (error: PostgrestError | null, amountColumn: AmountColumn) => {
  if (!error) return false;
  const text = getErrorText(error);
  return (
    (error.code === '42703' ||
      error.code === 'PGRST204' ||
      text.includes('column') ||
      text.includes('schema cache')) &&
    text.includes(amountColumn)
  );
};

export const getAmountValue = (record: Record<string, unknown> | null | undefined) => {
  const amount = record?.amount;
  if (typeof amount === 'number') return amount;
  if (typeof amount === 'string' && amount.trim().length > 0) return Number(amount);

  const legacyAmount = record?.amount_usdc;
  if (typeof legacyAmount === 'number') return legacyAmount;
  if (typeof legacyAmount === 'string' && legacyAmount.trim().length > 0) return Number(legacyAmount);

  return null;
};

export const runWithAmountColumnFallback = async <T>(
  execute: (amountColumn: AmountColumn) => PromiseLike<{ data: T; error: PostgrestError | null }>
) => {
  let lastError: PostgrestError | null = null;

  for (const amountColumn of AMOUNT_COLUMNS) {
    const result = await execute(amountColumn);
    if (!result.error) {
      return { ...result, amountColumn };
    }

    lastError = result.error;
    if (!isMissingAmountColumn(result.error, amountColumn)) {
      return { data: result.data, error: result.error, amountColumn };
    }
  }

  return { data: null as T, error: lastError, amountColumn: AMOUNT_COLUMNS[0] };
};
