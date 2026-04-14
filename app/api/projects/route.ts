import { NextRequest, NextResponse } from 'next/server';
import type { PostgrestError } from '@supabase/supabase-js';
import { isProjectPubliclyVisible } from '@/lib/project-status';
import { runWithMinimumInvestmentFallback } from '@/lib/supabase-minimum-investment';
import {
  extractBearerToken,
  verifyPrivyAccessToken,
} from '@/utils/server/privy';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';
import {
  buildProjectsSearchPattern,
  normalizeProjectFilter,
  normalizeProjectRow,
  parseCsvValues,
  PROJECT_SELECT_WITH_MINIMUM_INVESTMENT,
  PROJECT_SELECT_WITHOUT_MINIMUM_INVESTMENT,
  type ProjectRecord,
} from '@/utils/projects/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JSON_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const;

const jsonNoStore = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  Object.entries(JSON_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  return response;
};

const coerceString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const parseLimit = (value: string | null) => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 24;
  return Math.min(parsed, 100);
};

const projectBelongsToUser = (project: ProjectRecord, userId: string | null) =>
  Boolean(userId) &&
  [project.owner_user_id, project.owner_id].filter(Boolean).includes(userId);

async function verifyOptionalRequest(request: NextRequest) {
  const accessToken = extractBearerToken(request.headers.get('authorization'));
  if (!accessToken) {
    return { error: null, verified: null };
  }

  try {
    const verified = await verifyPrivyAccessToken(accessToken);
    return { error: null, verified };
  } catch {
    return {
      error: jsonNoStore({ error: 'Invalid access token.' }, { status: 401 }),
      verified: null,
    };
  }
}

async function selectProjects<T>(
  execute: (selectFields: string) => PromiseLike<{ data: T; error: PostgrestError | null }>
) {
  return runWithMinimumInvestmentFallback((includeMinimumInvestment) =>
    execute(
      includeMinimumInvestment
        ? PROJECT_SELECT_WITH_MINIMUM_INVESTMENT
        : PROJECT_SELECT_WITHOUT_MINIMUM_INVESTMENT
    )
  );
}

export async function GET(request: NextRequest) {
  const { error, verified } = await verifyOptionalRequest(request);
  if (error) return error;

  const supabase = getSupabaseAdminClient();
  const projectId = coerceString(request.nextUrl.searchParams.get('projectId'));
  const ids = parseCsvValues(request.nextUrl.searchParams.get('ids'));
  const ownerIds = parseCsvValues(request.nextUrl.searchParams.get('ownerIds'));
  const rawSearch = coerceString(request.nextUrl.searchParams.get('search'));
  const includeOwnedHidden = request.nextUrl.searchParams.get('includeOwnedHidden') === 'true';
  const limit = parseLimit(request.nextUrl.searchParams.get('limit'));
  const requesterUserId = verified?.userId ?? null;

  try {
    if (projectId) {
      const { data, error: queryError } = await selectProjects((selectFields) =>
        supabase
          .from('projects')
          .select(selectFields)
          .eq('id', normalizeProjectFilter(projectId))
          .maybeSingle()
      );

      if (queryError) {
        return jsonNoStore(
          { error: 'Could not load the project.', details: queryError.message ?? null },
          { status: 500 }
        );
      }

      if (!data) {
        return jsonNoStore({ data: null }, { status: 200 });
      }

      const normalizedProject = normalizeProjectRow(data as unknown as Record<string, unknown>);
      const isOwner = projectBelongsToUser(normalizedProject, requesterUserId);
      if (!isOwner && !isProjectPubliclyVisible(normalizedProject)) {
        return jsonNoStore({ data: null }, { status: 200 });
      }

      return jsonNoStore({ data: normalizedProject }, { status: 200 });
    }

    if (ids.length > 0) {
      const normalizedIds = ids.map(normalizeProjectFilter);
      const { data, error: queryError } = await selectProjects((selectFields) =>
        supabase
          .from('projects')
          .select(selectFields)
          .in('id', normalizedIds)
          .order('created_at', { ascending: false })
      );

      if (queryError) {
        return jsonNoStore(
          { error: 'Could not load the requested projects.', details: queryError.message ?? null },
          { status: 500 }
        );
      }

      const visibleProjects = ((data ?? []) as unknown as Record<string, unknown>[])
        .map(normalizeProjectRow)
        .filter((project) => {
          if (projectBelongsToUser(project, requesterUserId)) return true;
          return isProjectPubliclyVisible(project);
        });

      return jsonNoStore({ data: visibleProjects }, { status: 200 });
    }

    if (ownerIds.length > 0) {
      const [byOwnerUserId, byOwnerId] = await Promise.all([
        selectProjects((selectFields) =>
          supabase
            .from('projects')
            .select(selectFields)
            .in('owner_user_id', ownerIds)
            .order('created_at', { ascending: false })
            .limit(limit * 3)
        ),
        selectProjects((selectFields) =>
          supabase
            .from('projects')
            .select(selectFields)
            .in('owner_id', ownerIds)
            .order('created_at', { ascending: false })
            .limit(limit * 3)
        ),
      ]);

      const queryError = byOwnerUserId.error ?? byOwnerId.error;
      if (queryError) {
        return jsonNoStore(
          { error: 'Could not load projects for these owners.', details: queryError.message ?? null },
          { status: 500 }
        );
      }

      const merged = new Map<string, ProjectRecord>();
      [
        ...(((byOwnerUserId.data ?? []) as unknown as Record<string, unknown>[])),
        ...(((byOwnerId.data ?? []) as unknown as Record<string, unknown>[])),
      ]
        .map(normalizeProjectRow)
        .filter((project) => {
          if (projectBelongsToUser(project, requesterUserId)) return true;
          return isProjectPubliclyVisible(project);
        })
        .forEach((project) => {
          if (!merged.has(project.id)) {
            merged.set(project.id, project);
          }
        });

      return jsonNoStore({ data: Array.from(merged.values()).slice(0, limit) }, { status: 200 });
    }

    const search = rawSearch.replace(/[,()]/g, ' ').trim();
    if (search) {
      const wildcardTerm = buildProjectsSearchPattern(search);
      const filters = [
        `title.ilike.${wildcardTerm}`,
        `business_name.ilike.${wildcardTerm}`,
        `owner_user_id.ilike.${wildcardTerm}`,
        `owner_id.ilike.${wildcardTerm}`,
      ];

      const numericId = Number(search);
      if (Number.isFinite(numericId)) {
        filters.push(`id.eq.${numericId}`);
      } else if (/^[0-9a-f-]{8,}$/i.test(search)) {
        filters.push(`id.eq.${search}`);
      }

      const { data, error: queryError } = await selectProjects((selectFields) =>
        supabase
          .from('projects')
          .select(selectFields)
          .or(filters.join(','))
          .order('created_at', { ascending: false })
          .limit(limit * 3)
      );

      if (queryError) {
        return jsonNoStore(
          { error: 'Could not search projects.', details: queryError.message ?? null },
          { status: 500 }
        );
      }

      const visibleProjects = ((data ?? []) as unknown as Record<string, unknown>[])
        .map(normalizeProjectRow)
        .filter((project) => {
          if (projectBelongsToUser(project, requesterUserId) && includeOwnedHidden) {
            return true;
          }
          return isProjectPubliclyVisible(project);
        })
        .slice(0, limit);

      return jsonNoStore({ data: visibleProjects }, { status: 200 });
    }

    const { data, error: queryError } = await selectProjects((selectFields) =>
      supabase
        .from('projects')
        .select(selectFields)
        .order('created_at', { ascending: false })
        .limit(limit * 3)
    );

    if (queryError) {
      return jsonNoStore(
        { error: 'Could not load projects.', details: queryError.message ?? null },
        { status: 500 }
      );
    }

    const visibleProjects = ((data ?? []) as unknown as Record<string, unknown>[])
      .map(normalizeProjectRow)
      .filter((project) => {
        if (projectBelongsToUser(project, requesterUserId) && includeOwnedHidden) {
          return true;
        }
        return isProjectPubliclyVisible(project);
      })
      .slice(0, limit);

    return jsonNoStore({ data: visibleProjects }, { status: 200 });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Projects request failed.', details: message }, { status: 500 });
  }
}
