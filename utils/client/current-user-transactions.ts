'use client';

import type {
  CreateCurrentUserTransactionPayload,
  CurrentUserTransaction,
} from '@/utils/transactions/current-user';

type AccessTokenGetter = () => Promise<string | null | undefined>;
type QueryValue = string | number | boolean | null | undefined;

type CurrentUserTransactionsResponse<T> =
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

async function requestCurrentUserTransactions<T>(
  getAccessToken: AccessTokenGetter,
  init: RequestInit,
  query?: Record<string, QueryValue>
): Promise<CurrentUserTransactionsResponse<T>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const headers = new Headers(init.headers ?? {});
  headers.set('Authorization', `Bearer ${accessToken}`);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api/me/transactions${buildSearchParams(query)}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: T | null; error?: string; details?: string | null }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'Transactions request failed.';
    return {
      data: null,
      error: json?.details ? `${baseMessage}: ${json.details}` : baseMessage,
    };
  }

  return {
    data: (json?.data ?? null) as T,
    error: null,
  };
}

export async function fetchCurrentUserTransactions(
  getAccessToken: AccessTokenGetter,
  query?: Record<string, QueryValue>
): Promise<CurrentUserTransactionsResponse<CurrentUserTransaction[]>> {
  return requestCurrentUserTransactions<CurrentUserTransaction[]>(
    getAccessToken,
    { method: 'GET' },
    query
  );
}

export async function createCurrentUserTransaction(
  getAccessToken: AccessTokenGetter,
  payload: CreateCurrentUserTransactionPayload
): Promise<CurrentUserTransactionsResponse<CurrentUserTransaction>> {
  return requestCurrentUserTransactions<CurrentUserTransaction>(getAccessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
