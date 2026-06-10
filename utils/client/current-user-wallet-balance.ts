'use client';

type AccessTokenGetter = () => Promise<string | null | undefined>;

type CurrentUserWalletBalanceResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

async function requestCurrentUserWalletBalance<T>(
  getAccessToken: AccessTokenGetter,
  init?: RequestInit
): Promise<CurrentUserWalletBalanceResponse<T>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const headers = new Headers(init?.headers ?? {});
  headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch('/api/me/wallet-balance', {
    ...init,
    headers,
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: T | null; error?: string; details?: string | null }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'Wallet balance request failed.';
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

export async function syncCurrentUserWalletBalance(
  getAccessToken: AccessTokenGetter
): Promise<CurrentUserWalletBalanceResponse<{ available_wallet_usd: number }>> {
  return requestCurrentUserWalletBalance<{ available_wallet_usd: number }>(getAccessToken, {
    method: 'POST',
  });
}
