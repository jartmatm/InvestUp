'use client';

type AccessTokenGetter = () => Promise<string | null | undefined>;

type CurrentUserProfileResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

async function requestCurrentUserProfile<T>(
  getAccessToken: AccessTokenGetter,
  init?: RequestInit
): Promise<CurrentUserProfileResponse<T>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const headers = new Headers(init?.headers ?? {});
  headers.set('Authorization', `Bearer ${accessToken}`);

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch('/api/me/profile', {
    ...init,
    headers,
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: T | null; error?: string; details?: string | null }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'Profile request failed.';
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

export async function fetchCurrentUserProfile<T>(
  getAccessToken: AccessTokenGetter
): Promise<CurrentUserProfileResponse<T>> {
  return requestCurrentUserProfile<T>(getAccessToken, { method: 'GET' });
}

export async function patchCurrentUserProfile<T>(
  getAccessToken: AccessTokenGetter,
  payload: Record<string, unknown>
): Promise<CurrentUserProfileResponse<T>> {
  return requestCurrentUserProfile<T>(getAccessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
