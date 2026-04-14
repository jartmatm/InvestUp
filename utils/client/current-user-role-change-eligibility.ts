'use client';

type AccessTokenGetter = () => Promise<string | null | undefined>;

export type CurrentUserRoleChangeEligibility = {
  canChangeRole: boolean;
  hasInvestments: boolean;
  hasProjects: boolean;
  investmentCount: number;
  projectCount: number;
  message: string | null;
};

type CurrentUserRoleChangeEligibilityResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export async function fetchCurrentUserRoleChangeEligibility(
  getAccessToken: AccessTokenGetter
): Promise<CurrentUserRoleChangeEligibilityResponse<CurrentUserRoleChangeEligibility | null>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const response = await fetch('/api/me/role-change-eligibility', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: CurrentUserRoleChangeEligibility | null; error?: string; details?: string | null }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'Role change eligibility request failed.';
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
