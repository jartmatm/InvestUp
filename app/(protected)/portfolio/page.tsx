'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
import BottomNav from '@/components/BottomNav';
import { DesktopAppShell, DesktopSectionCard } from '@/components/DesktopAppShell';
import DesktopSidebar from '@/components/DesktopSidebar';
import DesktopTopbar from '@/components/DesktopTopbar';
import { SectionLoadingSkeleton } from '@/components/AppLoadingSkeleton';
import EntrepreneurFeedDashboard from '@/components/EntrepreneurFeedDashboard';
import InvestorPortfolioDashboard from '@/components/InvestorPortfolioDashboard';
import { useInvestApp } from '@/lib/investapp-context';
import {
  canDeleteProject,
  canPauseProject,
  getProjectStatusLabel,
  getProjectStatusTone,
  type ProjectStatus,
} from '@/lib/project-status';
import { getMinimumInvestmentValue } from '@/lib/supabase-minimum-investment';
import { useUserProfileSummary } from '@/lib/use-user-profile-summary';
import {
  deleteCurrentUserProject,
  fetchCurrentUserProject,
  fetchCurrentUserProjects,
  updateCurrentUserProject,
} from '@/utils/client/current-user-projects';

type ProjectRow = {
  id: string;
  owner_user_id: string | null;
  owner_id: string | null;
  status: ProjectStatus | string | null;
  title: string;
  business_name: string | null;
  sector: string | null;
  legal_representative: string | null;
  nit: string | null;
  opening_date: string | null;
  address: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  description: string;
  amount_requested: number | null;
  minimum_investment: number | null;
  amount_received: number | null;
  currency: string | null;
  term_months: number | null;
  installment_count: number | null;
  interest_rate: number | null;
  publication_end_date: string | null;
  photo_urls: string[] | null;
  video_url: string | null;
  created_at: string;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message ?? error);
  }
  return String(error);
};

const surfaceClassName =
  'rounded-[30px] border border-white/85 bg-white/88 p-4 shadow-[0_24px_70px_rgba(31,38,64,0.10)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl';

function SectionSurface({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`${surfaceClassName} ${className}`}>{children}</section>;
}

function StatusBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function IconEdit() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 5v14" />
      <path d="M16 5v14" />
    </svg>
  );
}

function IconDelete() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 12h10l1-12" />
      <path d="M9 7V4.5h6V7" />
    </svg>
  );
}

function DesktopEntrepreneurTopbar({
  avatarUrl,
  displayName,
  loadingProfileSummary,
  onNotifications,
  publishDisabled,
}: {
  avatarUrl: string;
  displayName: string;
  loadingProfileSummary: boolean;
  onNotifications: () => void;
  publishDisabled: boolean;
}) {
  return (
    <DesktopTopbar
      avatarUrl={avatarUrl}
      displayName={displayName}
      loading={loadingProfileSummary}
      notificationOnClick={onNotifications}
      publishDisabled={publishDisabled}
      roleLabel="Entrepreneur"
      searchPlaceholder="Search funding, investors or project activity..."
    />
  );
}

function DesktopEntrepreneurDashboardShell({
  avatarUrl,
  displayName,
  loadingProfileSummary,
  onNotifications,
  publishDisabled,
}: {
  avatarUrl: string;
  displayName: string;
  loadingProfileSummary: boolean;
  onNotifications: () => void;
  publishDisabled: boolean;
}) {
  return (
    <div className="investapp-desktop-autofit hidden min-h-screen bg-[#F8F9FB] text-[#101828] lg:block">
      <DesktopSidebar roleLabel="Entrepreneur" />
      <div className="min-w-0 pl-[260px]">
        <DesktopEntrepreneurTopbar
          avatarUrl={avatarUrl}
          displayName={displayName}
          loadingProfileSummary={loadingProfileSummary}
          onNotifications={onNotifications}
          publishDisabled={publishDisabled}
        />
        <main className="px-5 py-5 xl:px-7 2xl:px-9">
          <div className="w-full">
            <EntrepreneurFeedDashboard embedded desktop />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const t = useTranslations('Portfolio');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, rolSeleccionado } = useInvestApp();
  const { avatarUrl, displayName: profileName, loading: loadingProfileSummary } = useUserProfileSummary();
  const [myProjects, setMyProjects] = useState<ProjectRow[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [status, setStatus] = useState('');
  const editProjectIdFromUrl = searchParams.get('edit');
  const newProjectFromUrl = searchParams.get('new') === '1';

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  const loadMyProjects = useCallback(async () => {
    if (!user?.id) return;
    setLoadingProjects(true);
    const { data, error } = await fetchCurrentUserProjects(getAccessToken);

    if (error) {
      setStatus(`Could not load your projects: ${error}`);
      setLoadingProjects(false);
      return;
    }
    setMyProjects(
      ((data ?? []) as ProjectRow[]).map((project) => ({
        ...project,
        minimum_investment: getMinimumInvestmentValue(project),
      }))
    );
    setLoadingProjects(false);
  }, [getAccessToken, user?.id]);

  useEffect(() => {
    if (rolSeleccionado === 'emprendedor') {
      queueMicrotask(() => {
        void loadMyProjects();
      });
    }
  }, [loadMyProjects, rolSeleccionado]);

  const loadOwnedProjectState = useCallback(
    async (projectId: string) => {
      if (!user?.id) return null;

      const { data, error } = await fetchCurrentUserProject(getAccessToken, projectId);
      if (error) {
        throw new Error(error);
      }

      return data as Pick<ProjectRow, 'id' | 'status' | 'amount_received'> | null;
    },
    [getAccessToken, user?.id]
  );

  const openEditWizard = useCallback(
    async (project: ProjectRow) => {
      if (!user?.id) return;

      try {
        const latestProject = await loadOwnedProjectState(project.id);
        const effectiveProject = latestProject ?? project;

        if (!canDeleteProject(effectiveProject)) {
          setStatus('This listing already has financing activity and cannot be edited from the wizard.');
          await loadMyProjects();
          return;
        }

        router.push(`/publish?edit=${project.id}`);
      } catch (error) {
        setStatus(`Could not verify the latest project state: ${getErrorMessage(error)}`);
      }
    },
    [loadMyProjects, loadOwnedProjectState, router, user?.id]
  );

  useEffect(() => {
    if (editProjectIdFromUrl) {
      router.replace(`/publish?edit=${editProjectIdFromUrl}`);
      return;
    }

    if (newProjectFromUrl) {
      router.replace('/publish');
    }
  }, [editProjectIdFromUrl, newProjectFromUrl, router]);

  const deletePublication = async (project: ProjectRow) => {
    if (!user?.id) return;
    try {
      const latestProject = await loadOwnedProjectState(project.id);
      if (!latestProject || !canDeleteProject(latestProject)) {
        setStatus('A listing with financing in progress cannot be deleted.');
        await loadMyProjects();
        return;
      }

      const confirmed = window.confirm('Do you want to delete this listing?');
      if (!confirmed) return;
      const { error } = await deleteCurrentUserProject(getAccessToken, project.id);

      if (error) {
        setStatus(`Could not delete the listing: ${error}`);
        return;
      }
      setStatus('Listing deleted.');
      await loadMyProjects();
    } catch (error) {
      setStatus(`Could not verify the latest project state: ${getErrorMessage(error)}`);
    }
  };

  const togglePausePublication = async (project: ProjectRow) => {
    if (!user?.id) return;

    try {
      const latestProject = await loadOwnedProjectState(project.id);
      const effectiveProject = latestProject ?? project;
      if (!canPauseProject(effectiveProject) && effectiveProject.status !== 'paused') {
        setStatus('Listings with financing in progress cannot be paused.');
        await loadMyProjects();
        return;
      }

      const nextStatus: ProjectStatus =
        effectiveProject.status === 'paused' ? 'published' : 'paused';
      const { error } = await updateCurrentUserProject(getAccessToken, project.id, {
        status: nextStatus,
      });

      if (error) {
        setStatus(`Could not update the listing: ${error}`);
        return;
      }

      setStatus(nextStatus === 'paused' ? 'Listing paused.' : 'Listing resumed.');
      await loadMyProjects();
    } catch (error) {
      setStatus(`Could not verify the latest project state: ${getErrorMessage(error)}`);
    }
  };

  if (faseApp === 'loading' || !rolSeleccionado) {
    return (
      <>
        <DesktopAppShell
          title={t('loadingTitle')}
          subtitle={t('loadingSubtitle')}
          eyebrow={t('loadingEyebrow')}
          maxWidthClassName="max-w-none"
          hideHeader
        >
          <DesktopSectionCard>
            <SectionLoadingSkeleton rows={4} />
          </DesktopSectionCard>
        </DesktopAppShell>
        <main className="relative min-h-screen bg-[linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_100%)] px-4 pb-32 pt-8 text-[#101828] lg:hidden">
          <div className="mx-auto w-full max-w-md">
            <SectionLoadingSkeleton rows={4} />
          </div>
        </main>
      </>
    );
  }

  if (rolSeleccionado === 'inversor') {
    return <InvestorPortfolioDashboard />;
  }

  const desktopDisplayName = profileName || 'Entrepreneur';

  return (
    <>
      <DesktopEntrepreneurDashboardShell
        avatarUrl={avatarUrl}
        displayName={desktopDisplayName}
        loadingProfileSummary={loadingProfileSummary}
        onNotifications={() => router.push('/notifications')}
        publishDisabled={loadingProjects || myProjects.length >= 1}
      />

      <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.14),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_52%,#F8F9FD_100%)] pb-36 text-[#101828] lg:hidden">
        <div className="pointer-events-none absolute left-1/2 top-[-9rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 top-56 h-64 w-64 rounded-full bg-[#B9A8FF]/16 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-[32rem] h-64 w-64 rounded-full bg-[#7DE0B8]/8 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-8 pt-8">
          <section className="flex flex-col gap-3">
            {loadingProjects ? (
              <SectionLoadingSkeleton rows={2} />
            ) : null}

            {!loadingProjects && myProjects.length === 0 ? (
              <SectionSurface className="text-sm text-[#667085]">
                You have not published any projects yet.
              </SectionSurface>
            ) : null}

            {myProjects.map((project) => {
              const projectStatusLabel = getProjectStatusLabel(project);

              return (
                <SectionSurface key={project.id} className="overflow-hidden">
                  <div className="relative overflow-hidden rounded-[24px] border border-[#E9EAF5] bg-[#0F172A] shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                    <div className="relative h-32 w-full overflow-hidden">
                      {project.photo_urls?.[0] ? (
                        <div
                          role="img"
                          aria-label={project.title}
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url("${project.photo_urls[0]}")` }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#3B2F93_0%,#201942_100%)] text-white">
                          <span className="text-lg font-semibold tracking-[0.08em]">
                            {project.title.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.12)_42%,rgba(15,23,42,0.64)_100%)]" />
                      <div className="absolute left-3 top-3">
                        <StatusBadge className={getProjectStatusTone(project)}>
                          {projectStatusLabel}
                        </StatusBadge>
                      </div>
                    </div>

                    <div className="relative px-4 pb-4 pt-3 text-white">
                      <h3 className="text-[1.05rem] font-semibold tracking-[-0.03em]">
                        {project.title}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => void openEditWizard(project)}
                      className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] px-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:-translate-y-0.5"
                    >
                      <IconEdit />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePausePublication(project)}
                      disabled={!canPauseProject(project) && project.status !== 'paused'}
                      className={`flex min-h-[46px] items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition ${
                        !canPauseProject(project) && project.status !== 'paused'
                          ? 'border-[#E1E5F0] bg-[#F4F5F8] text-[#A0A7B9]'
                          : 'border-[#DDD3FF] bg-white text-[#6B39F4] shadow-[0_14px_28px_rgba(31,38,64,0.06)] hover:-translate-y-0.5 hover:bg-[#FBFAFF]'
                      }`}
                    >
                      <IconPause />
                      {project.status === 'paused' ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePublication(project)}
                      disabled={!canDeleteProject(project)}
                      className={`flex min-h-[46px] items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition ${
                        canDeleteProject(project)
                          ? 'border-[#F5CDD3] bg-[#FFF6F7] text-[#DF1C41] shadow-[0_14px_28px_rgba(31,38,64,0.05)] hover:-translate-y-0.5'
                          : 'border-[#E1E5F0] bg-[#F4F5F8] text-[#A0A7B9]'
                      }`}
                    >
                      <IconDelete />
                      Delete
                    </button>
                  </div>
                </SectionSurface>
              );
            })}
          </section>

          <EntrepreneurFeedDashboard embedded />

          {status ? (
            <SectionSurface className="text-xs leading-6 text-[#7B879C]">{status}</SectionSurface>
          ) : null}
        </div>
      </main>

      <div className="lg:hidden">
        <BottomNav />
      </div>
    </>
  );
}
