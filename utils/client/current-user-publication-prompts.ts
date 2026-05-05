'use client';

type AccessTokenGetter = () => Promise<string | null | undefined>;

export type OptimizedPublication = {
  title?: string;
  tittle?: string;
  summary?: string;
  description?: string;
  highlights?: string[];
  traction?: string;
  useOfFunds?: string;
  marketOpportunity?: string;
  investorNotes?: string;
  overview?: string;
  whatWeDo?: string;
  financialInformation?: string;
  investment?: string;
  target?: string;
  team?: string;
  gallery?: string;
  extras?: string;
};

export type PublicationPromptPayload = {
  id?: string | null;
  promptJson: unknown;
  promptText: string;
  metadata?: Record<string, unknown>;
};

export type PublicationPromptResult = {
  id: string;
  provider: string;
  optimizedPublication: OptimizedPublication;
};

export type PublicationPromptDraft = {
  id: string;
  promptJson: unknown;
  promptText: string;
  optimizedPublication: OptimizedPublication | null;
  provider: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
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

export async function fetchCurrentUserPublicationDraft(
  getAccessToken: AccessTokenGetter
): Promise<PublicationPromptResponse<PublicationPromptDraft | null>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const response = await fetch('/api/me/publication-prompts', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: PublicationPromptDraft | null; error?: string; details?: string | null }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'Publication draft request failed.';
    return {
      data: null,
      error: json?.details ? `${baseMessage}: ${json.details}` : baseMessage,
    };
  }

  return {
    data: (json?.data ?? null) as PublicationPromptDraft | null,
    error: null,
  };
}

export async function saveCurrentUserPublicationDraft(
  getAccessToken: AccessTokenGetter,
  payload: PublicationPromptPayload
): Promise<PublicationPromptResponse<PublicationPromptDraft>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const response = await fetch('/api/me/publication-prompts', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify(payload),
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: PublicationPromptDraft | null; error?: string; details?: string | null }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'Publication draft save failed.';
    return {
      data: null,
      error: json?.details ? `${baseMessage}: ${json.details}` : baseMessage,
    };
  }

  return {
    data: (json?.data ?? null) as PublicationPromptDraft,
    error: null,
  };
}
