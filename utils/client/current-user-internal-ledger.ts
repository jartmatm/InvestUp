'use client';

import type {
  InternalAccountBalance,
  InternalLedgerEntry,
} from '@/utils/internal-ledger/types';

type AccessTokenGetter = () => Promise<string | null | undefined>;

type CurrentUserInternalLedgerResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

const buildSearchParams = (query?: Record<string, string | number | null | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export async function fetchCurrentUserInternalLedger(
  getAccessToken: AccessTokenGetter,
  query?: { creditId?: string | null; limit?: number }
): Promise<
  CurrentUserInternalLedgerResponse<{
    balance: InternalAccountBalance | null;
    entries: InternalLedgerEntry[];
  }>
> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const response = await fetch(`/api/me/internal-ledger${buildSearchParams(query)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | {
        data?: { balance: InternalAccountBalance | null; entries: InternalLedgerEntry[] } | null;
        error?: string;
        details?: string | null;
      }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'Internal ledger request failed.';
    return {
      data: null,
      error: json?.details ? `${baseMessage}: ${json.details}` : baseMessage,
    };
  }

  return {
    data: json?.data ?? { balance: null, entries: [] },
    error: null,
  };
}
