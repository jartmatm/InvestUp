'use client';

type AccessTokenGetter = () => Promise<string | null | undefined>;

export type RecipientDirectoryEntry = {
  id: string;
  email: string | null;
  name: string | null;
  surname: string | null;
  avatar_url: string | null;
  country: string | null;
  role: 'investor' | 'entrepreneur';
  wallet_address: string | null;
};

type RecipientDirectoryResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

type FetchRecipientDirectoryQuery = {
  email?: string | null;
  ids?: string[] | null;
  limit?: number | null;
  role?: 'investor' | 'entrepreneur' | null;
  search?: string | null;
  wallet?: string | null;
  wallets?: string[] | null;
};

const buildSearchParams = (query?: FetchRecipientDirectoryQuery) => {
  const searchParams = new URLSearchParams();

  if (query?.role) searchParams.set('role', query.role);
  if (query?.email?.trim()) searchParams.set('email', query.email.trim());
  if (query?.search?.trim()) searchParams.set('search', query.search.trim());
  if (query?.wallet?.trim()) searchParams.set('wallet', query.wallet.trim());
  if (query?.ids?.length) {
    const ids = query.ids.map((entry) => entry.trim()).filter(Boolean);
    if (ids.length > 0) {
      searchParams.set('ids', ids.join(','));
    }
  }
  if (query?.wallets?.length) {
    const wallets = query.wallets.map((entry) => entry.trim()).filter(Boolean);
    if (wallets.length > 0) {
      searchParams.set('wallets', wallets.join(','));
    }
  }
  if (query?.limit && Number.isFinite(query.limit)) {
    searchParams.set('limit', String(query.limit));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export async function fetchRecipientDirectory(
  getAccessToken: AccessTokenGetter,
  query?: FetchRecipientDirectoryQuery
): Promise<RecipientDirectoryResponse<RecipientDirectoryEntry[]>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const response = await fetch(`/api/me/recipient-directory${buildSearchParams(query)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: RecipientDirectoryEntry[] | null; error?: string; details?: string | null }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'Recipient directory request failed.';
    return {
      data: null,
      error: json?.details ? `${baseMessage}: ${json.details}` : baseMessage,
    };
  }

  return {
    data: (json?.data ?? []) as RecipientDirectoryEntry[],
    error: null,
  };
}
