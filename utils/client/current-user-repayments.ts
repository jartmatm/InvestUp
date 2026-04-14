'use client';

type AccessTokenGetter = () => Promise<string | null | undefined>;

export type CreateCurrentUserRepaymentPayload = {
  txHash: string;
  transactionId?: string | null;
  transactionUuid?: string | null;
  amountUsdc: string;
  fromWallet: string;
  toWallet: string;
  projectId?: string | null;
  investorUserId?: string | null;
  receiverEmail?: string | null;
};

type CurrentUserRepaymentResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export async function createCurrentUserRepayment(
  getAccessToken: AccessTokenGetter,
  payload: CreateCurrentUserRepaymentPayload
): Promise<CurrentUserRepaymentResponse<{ id: string | null }>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const response = await fetch('/api/me/repayments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: { id: string | null } | null; error?: string; details?: string | null }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'Repayment request failed.';
    return {
      data: null,
      error: json?.details ? `${baseMessage}: ${json.details}` : baseMessage,
    };
  }

  return {
    data: json?.data ?? { id: null },
    error: null,
  };
}
