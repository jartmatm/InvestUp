'use client';

type AccessTokenGetter = () => Promise<string | null | undefined>;

export type OptimizedPublication = {
  title?: string;
  summary?: string;
  description?: string;
  highlights?: string[];
  traction?: string;
  useOfFunds?: string;
  marketOpportunity?: string;
  investorNotes?: string;
};

export type PublicationPromptPayload = {
  promptJson: unknown;
  promptText: string;
};

export type PublicationPromptResult = {
  id: string;
  provider: string;
  optimizedPublication: OptimizedPublication;
};

type PublicationPromptResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export async function createCurrentUserPublicationPrompt(
  getAccessToken: AccessTokenGetter,
  payload: PublicationPromptPayload
): Promise<PublicationPromptResponse<PublicationPromptResult>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const response = await fetch('/api/me/publication-prompts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify(payload),
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: PublicationPromptResult | null; error?: string; details?: string | null }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'Publication prompt request failed.';
    return {
      data: null,
      error: json?.details ? `${baseMessage}: ${json.details}` : baseMessage,
    };
  }

  return {
    data: (json?.data ?? null) as PublicationPromptResult,
    error: null,
  };
}
