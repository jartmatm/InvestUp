export type ProjectStatus =
  | 'draft'
  | 'published'
  | 'paused'
  | 'financing_in_progress'
  | 'closed';

type ProjectStatusLike = {
  status?: string | null;
  amount_received?: number | null;
  publication_end_date?: string | null;
  term_months?: number | null;
  installment_count?: number | null;
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
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const parseDateOnly = (
  value: string | null | undefined,
  mode: 'start' | 'end' = 'start'
) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const [, year, month, day] = match;
    return mode === 'end'
      ? new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999)
      : new Date(Number(year), Number(month) - 1, Number(day));
  }

  const fallback = new Date(value);
  if (Number.isNaN(fallback.getTime())) return null;
  if (mode === 'end') {
    return new Date(
      fallback.getFullYear(),
      fallback.getMonth(),
      fallback.getDate(),
      23,
      59,
      59,
      999
    );
  }
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
};

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

export const getProjectRepaymentTermMonths = (project: ProjectStatusLike) => {
  const months = Number(project.installment_count ?? project.term_months ?? 0);
  return Number.isFinite(months) && months > 0 ? months : null;
};

export const isProjectPublicationExpired = (project: ProjectStatusLike) => {
  const endDate = parseDateOnly(project.publication_end_date, 'end');
  if (!endDate) return false;
  return Date.now() > endDate.getTime();
};

export const isProjectPublicationDueSoon = (project: ProjectStatusLike) => {
  const normalizedStatus = normalizeLegacyProjectStatus(project.status);
  if (normalizedStatus !== 'published') return false;
  if (isProjectFunded(project)) return false;
  const endDate = parseDateOnly(project.publication_end_date, 'start');
  if (!endDate) return false;

  const daysRemaining = Math.floor(
    (endDate.getTime() - startOfToday().getTime()) / MS_PER_DAY
  );
  return daysRemaining >= 0 && daysRemaining <= 15;
};

export const isProjectPubliclyVisible = (project: ProjectStatusLike) => {
  const status = resolveProjectStatus(project);
  if (status === 'financing_in_progress') return true;
  if (status !== 'published') return false;
  return !isProjectPublicationExpired(project);
};

export const canPauseProject = (project: ProjectStatusLike) =>
  !isProjectFunded(project) && resolveProjectStatus(project) !== 'closed';

export const getProjectStatusLabel = (project: ProjectStatusLike) => {
  const status = resolveProjectStatus(project);

  if (status === 'financing_in_progress') return 'Financing in progress';
  if (status === 'paused') return 'Paused';
  if (status === 'closed') return 'Closed';
  if (status === 'draft') return 'Draft';
  if (isProjectPublicationExpired(project)) return 'Expired';
  if (isProjectPublicationDueSoon(project)) return 'Due soon';
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

  if (isProjectPublicationExpired(project)) {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (isProjectPublicationDueSoon(project)) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-primary/20 bg-primary/10 text-primary';
};
