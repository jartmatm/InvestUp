'use client';

import type { CurrentUserKycSummary, KycDocumentType } from '@/utils/kyc/shared';

type AccessTokenGetter = () => Promise<string | null | undefined>;

type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

async function requestCurrentUserKyc<T>(
  getAccessToken: AccessTokenGetter,
  url: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const headers = new Headers(init?.headers ?? {});
  headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: T | null; error?: string; details?: string | null }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'KYC request failed.';
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

export async function fetchCurrentUserKycSummary(
  getAccessToken: AccessTokenGetter,
  requestedAmountUsd?: number
): Promise<ApiResponse<CurrentUserKycSummary>> {
  const query =
    typeof requestedAmountUsd === 'number' && Number.isFinite(requestedAmountUsd) && requestedAmountUsd > 0
      ? `?requestedAmountUsd=${encodeURIComponent(requestedAmountUsd.toString())}`
      : '';

  return requestCurrentUserKyc<CurrentUserKycSummary>(getAccessToken, `/api/me/kyc${query}`, {
    method: 'GET',
  });
}

export async function uploadCurrentUserKycDocument(
  getAccessToken: AccessTokenGetter,
  documentType: KycDocumentType,
  file: File
): Promise<ApiResponse<Record<string, unknown> | null>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const formData = new FormData();
  formData.set('documentType', documentType);
  formData.set('file', file);

  const response = await fetch('/api/me/kyc/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: Record<string, unknown> | null; error?: string; details?: string | null }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'KYC upload failed.';
    return {
      data: null,
      error: json?.details ? `${baseMessage}: ${json.details}` : baseMessage,
    };
  }

  return {
    data: (json?.data ?? null) as Record<string, unknown> | null,
    error: null,
  };
}
