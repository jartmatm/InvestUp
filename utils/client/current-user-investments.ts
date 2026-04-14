'use client';

import type {
  CreateCurrentUserInvestmentPayload,
  CurrentUserInvestment,
} from '@/utils/investments/current-user';

type AccessTokenGetter = () => Promise<string | null | undefined>;
type QueryValue = string | number | boolean | null | undefined;

type CurrentUserInvestmentsResponse<T> =
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

export async function fetchCurrentUserInvestments(
  getAccessToken: AccessTokenGetter,
  query?: Record<string, QueryValue>
): Promise<CurrentUserInvestmentsResponse<CurrentUserInvestment[]>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const response = await fetch(`/api/me/investments${buildSearchParams(query)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: CurrentUserInvestment[] | null; error?: string; details?: string | null }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'Investments request failed.';
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

export async function createCurrentUserInvestment(
  getAccessToken: AccessTokenGetter,
  payload: CreateCurrentUserInvestmentPayload
): Promise<CurrentUserInvestmentsResponse<CurrentUserInvestment | null>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const response = await fetch('/api/me/investments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: CurrentUserInvestment | null; error?: string; details?: string | null }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'Investment request failed.';
    return {
      data: null,
      error: json?.details ? `${baseMessage}: ${json.details}` : baseMessage,
    };
  }

  return {
    data: json?.data ?? null,
    error: null,
  };
}
