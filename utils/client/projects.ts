'use client';

import type { ProjectRecord } from '@/utils/projects/shared';

type AccessTokenGetter = (() => Promise<string | null | undefined>) | undefined;
type QueryValue = string | number | boolean | null | undefined;

type ProjectsResponse<T> = { data: T; error: null } | { data: null; error: string };

const buildSearchParams = (query?: Record<string, QueryValue>) => {
  const searchParams = new URLSearchParams();

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

async function requestProjects<T>(
  query?: Record<string, QueryValue>,
  getAccessToken?: AccessTokenGetter
): Promise<ProjectsResponse<T>> {
  const headers = new Headers();
  const accessToken = getAccessToken ? await getAccessToken() : null;
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`/api/projects${buildSearchParams(query)}`, {
    method: 'GET',
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

export async function fetchProjects(
  query?: Record<string, QueryValue>,
  getAccessToken?: AccessTokenGetter
): Promise<ProjectsResponse<ProjectRecord[]>> {
  return requestProjects<ProjectRecord[]>(query, getAccessToken);
}

export async function fetchProjectById(
  projectId: string,
  getAccessToken?: AccessTokenGetter
): Promise<ProjectsResponse<ProjectRecord | null>> {
  return requestProjects<ProjectRecord | null>({ projectId }, getAccessToken);
}
