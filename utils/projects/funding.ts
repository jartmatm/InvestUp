import { getAmountValue, runWithAmountColumnFallback } from '@/lib/supabase-amount';
import { normalizeProjectFilter, type ProjectRecord } from '@/utils/projects/shared';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';

const normalizeProjectIds = (
  projectIds: Array<string | number | null | undefined>
): Array<string | number> =>
  Array.from(
    new Set(
      projectIds
        .map((projectId) => {
          if (projectId === null || projectId === undefined) return null;
          const normalized = normalizeProjectFilter(String(projectId));
          return normalized === '' ? null : normalized;
        })
        .filter((projectId): projectId is string | number => projectId !== null)
    )
  );

export async function loadProjectFundingTotals(
  projectIds: Array<string | number | null | undefined>
) {
  const totals = new Map<string, number>();
  const normalizedIds = normalizeProjectIds(projectIds);

  if (normalizedIds.length === 0) {
    return totals;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await runWithAmountColumnFallback((amountColumn) =>
    supabase
      .from('investments')
      .select(`project_id,status,${amountColumn},amount_usdc`)
      .in('project_id', normalizedIds)
      .in('status', ['submitted', 'confirmed'])
  );

  if (error) {
    return totals;
  }

  ((data ?? []) as Array<Record<string, unknown>>).forEach((row) => {
    const projectId = String(row.project_id ?? '');
    if (!projectId) return;

    const amount = Number((getAmountValue(row) ?? 0).toFixed(6));
    const nextTotal = Number(((totals.get(projectId) ?? 0) + amount).toFixed(6));
    totals.set(projectId, nextTotal);
  });

  return totals;
}
export async function hydrateProjectsWithFundingTotals(projects: ProjectRecord[]) {
  if (projects.length === 0) {
    return projects;
  }

  const totals = await loadProjectFundingTotals(projects.map((project) => project.id));

  return projects.map((project) => {
    const total = totals.get(project.id);
    if (total === undefined) {
      return project;
    }

    const roundedTotal = Number(total.toFixed(2));
    if (Number(project.amount_received ?? 0) === roundedTotal) {
      return project;
    }

    return {
      ...project,
      amount_received: roundedTotal,
    };
  });
}
