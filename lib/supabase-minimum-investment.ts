import type { PostgrestError } from '@supabase/supabase-js';

export const MINIMUM_INVESTMENT_DEFAULT = 50;

const getErrorText = (error: PostgrestError | null) =>
  `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();

const isMissingMinimumInvestmentColumn = (error: PostgrestError | null) => {
  if (!error) return false;
  const text = getErrorText(error);
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    (text.includes('minimum_investment') &&
      (text.includes('column') || text.includes('schema cache')))
  );
};

export const getMinimumInvestmentValue = (
  record: Record<string, unknown> | null | undefined,
  fallback = MINIMUM_INVESTMENT_DEFAULT
) => {
  const value = record?.minimum_investment;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
};

export const runWithMinimumInvestmentFallback = async <T>(
  execute: (includeMinimumInvestment: boolean) => PromiseLike<{ data: T; error: PostgrestError | null }>
) => {
  const firstAttempt = await execute(true);
  if (!firstAttempt.error || !isMissingMinimumInvestmentColumn(firstAttempt.error)) {
    return { ...firstAttempt, includesMinimumInvestment: true };
  }

  const fallbackAttempt = await execute(false);
  return { ...fallbackAttempt, includesMinimumInvestment: false };
};
