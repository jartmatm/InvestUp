'use client';

import type { PaymentScheduleRecord } from '@/lib/payment-schedule';

type AccessTokenGetter = () => Promise<string | null | undefined>;
type QueryValue = string | number | boolean | null | undefined;

type CurrentUserPaymentScheduleResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

const buildSearchParams = (query?: Record<string, QueryValue>) => {
  const searchParams = new URLSearchParams();

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export async function fetchCurrentUserPaymentSchedule(
  getAccessToken: AccessTokenGetter,
  query?: Record<string, QueryValue>
): Promise<CurrentUserPaymentScheduleResponse<PaymentScheduleRecord[]>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const response = await fetch(`/api/me/payment-schedule${buildSearchParams(query)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: PaymentScheduleRecord[] | null; error?: string; details?: string | null }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'Payment schedule request failed.';
    return {
      data: null,
      error: json?.details ? `${baseMessage}: ${json.details}` : baseMessage,
    };
  }

  return {
    data: json?.data ?? [],
    error: null,
  };
}
