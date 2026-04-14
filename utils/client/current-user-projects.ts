'use client';

import type { ProjectMutationPayload, ProjectRecord } from '@/utils/projects/shared';

type AccessTokenGetter = () => Promise<string | null | undefined>;
type QueryValue = string | number | boolean | null | undefined;

type CurrentUserProjectsResponse<T> =
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

async function requestCurrentUserProjects<T>(
  getAccessToken: AccessTokenGetter,
  init?: RequestInit,
  query?: Record<string, QueryValue>
): Promise<CurrentUserProjectsResponse<T>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const headers = new Headers(init?.headers ?? {});
  headers.set('Authorization', `Bearer ${accessToken}`);

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api/me/projects${buildSearchParams(query)}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: T | null; error?: string; details?: string | null }
    | null;

  if (!response.ok) {
    const baseMessage = json?.error ?? 'Projects request failed.';
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

export async function fetchCurrentUserProjects(
  getAccessToken: AccessTokenGetter,
  query?: Record<string, QueryValue>
): Promise<CurrentUserProjectsResponse<ProjectRecord[]>> {
  return requestCurrentUserProjects<ProjectRecord[]>(getAccessToken, { method: 'GET' }, query);
}

export async function fetchCurrentUserProject(
  getAccessToken: AccessTokenGetter,
  projectId: string
): Promise<CurrentUserProjectsResponse<ProjectRecord | null>> {
  return requestCurrentUserProjects<ProjectRecord | null>(
    getAccessToken,
    { method: 'GET' },
    { projectId }
  );
}

export async function createCurrentUserProject(
  getAccessToken: AccessTokenGetter,
  payload: ProjectMutationPayload
): Promise<CurrentUserProjectsResponse<ProjectRecord | null>> {
  return requestCurrentUserProjects<ProjectRecord | null>(getAccessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCurrentUserProject(
  getAccessToken: AccessTokenGetter,
  projectId: string,
  payload: ProjectMutationPayload
): Promise<CurrentUserProjectsResponse<ProjectRecord | null>> {
  return requestCurrentUserProjects<ProjectRecord | null>(
    getAccessToken,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    { projectId }
  );
}

export async function deleteCurrentUserProject(
  getAccessToken: AccessTokenGetter,
  projectId: string
): Promise<CurrentUserProjectsResponse<{ id: string } | null>> {
  return requestCurrentUserProjects<{ id: string } | null>(
    getAccessToken,
    { method: 'DELETE' },
    { projectId }
  );
}
