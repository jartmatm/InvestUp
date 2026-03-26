export type ProjectStatus =
  | 'draft'
  | 'published'
  | 'paused'
  | 'financing_in_progress'
  | 'closed';

type ProjectStatusLike = {
  status?: string | null;
  amount_received?: number | null;
};

export const LEGACY_VISIBLE_PROJECT_STATUSES = [
  'published',
  'financing_in_progress',
  'active',
] as const;

const normalizeLegacyProjectStatus = (
  status: string | null | undefined
): ProjectStatus => {
  if (status === 'active') return 'published';
  return (status ?? 'published') as ProjectStatus;
};

export const ACTIVE_PROJECT_STATUSES = [...LEGACY_VISIBLE_PROJECT_STATUSES];

export const HOME_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

export const isProjectFunded = (project: ProjectStatusLike) =>
  Number(project.amount_received ?? 0) > 0;

export const resolveProjectStatus = (project: ProjectStatusLike): ProjectStatus => {
  if (isProjectFunded(project) && project.status !== 'closed') {
    return 'financing_in_progress';
  }

  const normalizedStatus = normalizeLegacyProjectStatus(project.status);
  return normalizedStatus;
};

export const getNextProjectStatusAfterFunding = (
  currentStatus: string | null | undefined,
  nextAmountReceived: number
): ProjectStatus => {
  if (nextAmountReceived > 0 && currentStatus !== 'closed') {
    return 'financing_in_progress';
  }

  return normalizeLegacyProjectStatus(currentStatus);
};

export const canDeleteProject = (project: ProjectStatusLike) => !isProjectFunded(project);

export const canPauseProject = (project: ProjectStatusLike) =>
  !isProjectFunded(project) && resolveProjectStatus(project) !== 'closed';

export const getProjectStatusLabel = (project: ProjectStatusLike) => {
  const status = resolveProjectStatus(project);

  if (status === 'financing_in_progress') return 'Financing in progress';
  if (status === 'paused') return 'Paused';
  if (status === 'closed') return 'Closed';
  if (status === 'draft') return 'Draft';
  return 'Published';
};

export const getProjectStatusTone = (project: ProjectStatusLike) => {
  const status = resolveProjectStatus(project);

  if (status === 'financing_in_progress') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (status === 'paused') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (status === 'closed') {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }

  if (status === 'draft') {
    return 'border-slate-200 bg-slate-50 text-slate-600';
  }

  return 'border-primary/20 bg-primary/10 text-primary';
};
