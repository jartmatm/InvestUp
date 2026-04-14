'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import PageFrame from '@/components/PageFrame';
import ProjectPhotoCarousel from '@/components/ProjectPhotoCarousel';
import { useInvestApp } from '@/lib/investapp-context';
import {
  getPaymentScheduleStatusMeta,
  normalizePaymentScheduleRecord,
} from '@/lib/payment-schedule';
import {
  getProjectRepaymentTermMonths,
  isProjectPubliclyVisible,
} from '@/lib/project-status';
import { toEnglishSector } from '@/lib/sector-labels';
import { fetchCurrentUserPaymentSchedule } from '@/utils/client/current-user-payment-schedule';
import { fetchProjectById } from '@/utils/client/projects';

type ProjectDetail = {
  id: string;
  title: string;
  description: string;
  sector: string | null;
  business_name: string | null;
  amount_requested: number | null;
  minimum_investment: number | null;
  amount_received: number | null;
  currency: string | null;
  term_months: number | null;
  installment_count: number | null;
  interest_rate: number | null;
  city: string | null;
  country: string | null;
  publication_end_date: string | null;
  status: string | null;
  photo_urls: string[] | null;
  video_url: string | null;
  owner_user_id: string | null;
  owner_wallet: string | null;
};

type PaymentScheduleGroup = {
  creditId: string;
  nextDueDate: string | null;
  installmentCount: number;
  status: string | null;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const formatAmount = (amount: number | null, currency: string | null) => {
  if (amount === null || amount === undefined) return 'No amount';
  const code = currency ?? 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
};

const normalizePhotos = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const calculateProgress = (raised: number | null, requested: number | null) => {
  if (!requested || requested <= 0) return 0;
  const progress = ((raised ?? 0) / requested) * 100;
  return Math.max(0, Math.min(100, progress));
};

export default function FeedDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const { user, getAccessToken } = usePrivy();
  const { faseApp, rolSeleccionado } = useInvestApp();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [scheduleGroups, setScheduleGroups] = useState<PaymentScheduleGroup[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [shareStatus, setShareStatus] = useState('');

  const supabase = useMemo(() => {
    const authedFetch: typeof fetch = async (input, init = {}) => {
      const token = await getAccessToken();
      const baseHeaders = new Headers(init.headers ?? {});
      baseHeaders.set('apikey', SUPABASE_ANON_KEY);
      const run = (headers: Headers) => fetch(input, { ...init, headers });
      if (!token) return run(baseHeaders);

      const headersWithAuth = new Headers(baseHeaders);
      headersWithAuth.set('Authorization', `Bearer ${token}`);
      const response = await run(headersWithAuth);
      if (response.ok) return response;

      const raw = (await response.clone().text()).toLowerCase();
      const shouldFallback =
        response.status === 401 ||
        response.status === 403 ||
        raw.includes('no suitable key') ||
        raw.includes('wrong key type') ||
        raw.includes('invalid jwt');
      if (!shouldFallback) return response;
      return run(baseHeaders);
    };

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: authedFetch },
    });
  }, [getAccessToken]);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        setStatus('Listing not found.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setStatus('');
      const { data, error } = await fetchProjectById(projectId, getAccessToken);

      if (error) {
        setStatus(`Could not load the listing: ${error}`);
        setLoading(false);
        return;
      }

      const normalizedProject = data
        ? ({
            ...(data as ProjectDetail),
            photo_urls: normalizePhotos((data as ProjectDetail).photo_urls),
          } as ProjectDetail)
        : null;

      if (
        normalizedProject &&
        rolSeleccionado !== 'emprendedor' &&
        !isProjectPubliclyVisible(normalizedProject)
      ) {
        setProject(null);
        setStatus('This listing is no longer active for new investments.');
        setLoading(false);
        return;
      }

      setProject(normalizedProject);
      setLoading(false);
    };

    loadProject();
  }, [projectId, rolSeleccionado, supabase]);

  useEffect(() => {
    const loadPaymentSchedule = async () => {
      if (!projectId || !user?.id || rolSeleccionado !== 'inversor') {
        setScheduleGroups([]);
        setScheduleLoading(false);
        return;
      }

      setScheduleLoading(true);
      const { data, error } = await fetchCurrentUserPaymentSchedule(getAccessToken, { projectId });

      if (error) {
        setStatus((previous) => previous || 'Could not load the payment schedule for this venture.');
        setScheduleGroups([]);
        setScheduleLoading(false);
        return;
      }

      const normalizedRecords = ((data ?? []) as Record<string, unknown>[]).map(
        normalizePaymentScheduleRecord
      );

      setScheduleGroups(
        normalizedRecords
          .filter((record) => record.investor_user_id === user.id)
          .map((record) => ({
          creditId: record.credit_id,
          nextDueDate: record.next_due_date,
          installmentCount: record.installment_count,
          status: record.status,
          }))
      );
      setScheduleLoading(false);
    };

    void loadPaymentSchedule();
  }, [getAccessToken, projectId, rolSeleccionado, supabase, user?.id]);

  const isEntrepreneurView = rolSeleccionado === 'emprendedor';
  const canEditProject = Boolean(isEntrepreneurView && user?.id && project?.owner_user_id === user.id);
  const repaymentTermMonths = getProjectRepaymentTermMonths(project ?? {});

  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/feed/${project?.id ?? projectId}`;
  };

  const openSharePopup = () => {
    setShareStatus('');
    setShowShareOptions(true);
  };

  const shareText = project?.title ? `Check out ${project.title} on InvestApp` : 'Check out this venture on InvestApp';

  const copyShareLink = async () => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      setShareStatus('Link copied.');
    } catch {
      setShareStatus('Could not copy the link.');
    }
  };

  const openShareWindow = (url: string) => {
    if (typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <PageFrame title="Details" subtitle="Full listing">
      {loading ? <p className="text-sm text-gray-500">Loading listing...</p> : null}
      {status ? <p className="text-sm text-gray-500">{status}</p> : null}

      {!loading && project ? (
        <div className="space-y-4 pb-8">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full border border-white/25 bg-white/20 px-4 py-2 text-sm font-semibold text-gray-700 backdrop-blur-md"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (canEditProject) {
                  router.push(`/portfolio?edit=${project.id}`);
                  return;
                }
                if (isEntrepreneurView) {
                  openSharePopup();
                  return;
                }
                router.push(`/feed/${project.id}/invest`);
              }}
              disabled={!isEntrepreneurView && !project.owner_wallet}
              className={`rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg transition ${
                isEntrepreneurView || project.owner_wallet ? 'bg-[#6B39F4]' : 'bg-[#6B39F4]/40'
              }`}
            >
              {canEditProject ? 'Edit' : isEntrepreneurView ? 'Share' : 'Invest'}
            </button>
          </div>

          <ProjectPhotoCarousel
            images={project.photo_urls}
            alt={project.title}
            className="h-56 w-full rounded-2xl border border-white/25 bg-white/20 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md"
            imageClassName="h-56 w-full object-cover"
          />

          <div className="rounded-2xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{project.title}</h2>
                {project.business_name ? (
                  <p className="mt-1 text-sm text-gray-500">{project.business_name}</p>
                ) : null}
              </div>
              {project.sector ? (
                <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {toEnglishSector(project.sector)}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm text-gray-700">{project.description}</p>
          </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
                  <p className="text-xs text-gray-500">Funding goal</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {formatAmount(project.amount_requested, project.currency)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
                  <p className="text-xs text-gray-500">Raised amount</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {formatAmount(project.amount_received, project.currency)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
                  <p className="text-xs text-gray-500">Installments</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                {repaymentTermMonths ? `${repaymentTermMonths} months` : '--'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <p className="text-xs text-gray-500">EA rate</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {project.interest_rate ? `${project.interest_rate}%` : '--'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <p className="text-xs text-gray-500">Minimum investment</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatAmount(project.minimum_investment, project.currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <p className="text-xs text-gray-500">Location</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {project.city || project.country
                  ? `${project.city ?? ''} ${project.country ?? ''}`.trim()
                  : 'Pending'}
              </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Funding progress</span>
                  <span>{calculateProgress(project.amount_received, project.amount_requested).toFixed(0)}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200/80">
                  <div
                    className="h-2 rounded-full bg-[#6B39F4]"
                    style={{ width: `${calculateProgress(project.amount_received, project.amount_requested)}%` }}
                  />
                </div>
              </div>

          {project.publication_end_date ? (
            <div className="rounded-2xl border border-white/25 bg-white/20 p-4 text-sm text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <span className="text-xs text-gray-500">Deadline</span>
              <p className="mt-1 font-semibold text-gray-900">{project.publication_end_date}</p>
            </div>
          ) : null}

          {!isEntrepreneurView && !project.owner_wallet ? (
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/30 p-4 text-sm text-amber-900 backdrop-blur-md">
              This venture does not have a configured wallet yet, so the investment cannot start right now.
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              if (isEntrepreneurView) {
                openSharePopup();
                return;
              }
              router.push(`/feed/${project.id}/invest`);
            }}
            disabled={!isEntrepreneurView && !project.owner_wallet}
            className={`w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white shadow-lg transition ${
              isEntrepreneurView || project.owner_wallet ? 'bg-[#6B39F4]' : 'bg-[#6B39F4]/40'
            }`}
          >
            {isEntrepreneurView ? 'Share' : 'Invest in this venture'}
          </button>

          {!isEntrepreneurView ? (
            <section className="rounded-2xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Contract</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Open the backend contract ledger and review the full amortization plan on a
                  dedicated page.
                </p>
              </div>

              <div className="mt-4">
                {scheduleLoading ? (
                  <p className="text-sm text-gray-500">Loading contract...</p>
                ) : scheduleGroups.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Your contract will appear here once your investment is confirmed.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {scheduleGroups.map((group, index) => {
                      const statusMeta = getPaymentScheduleStatusMeta(group.status);

                      return (
                        <div
                          key={group.creditId}
                          className="rounded-2xl border border-white/20 bg-white/25 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                                Credit {String(index + 1).padStart(2, '0')}
                              </p>
                              <p className="mt-2 text-sm text-gray-600">
                                {group.nextDueDate
                                  ? `Next due ${new Date(group.nextDueDate).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: '2-digit',
                                    })}`
                                  : 'Next due pending'}
                              </p>
                              <p className="mt-1 text-sm text-gray-600">
                                {group.installmentCount} installment
                                {group.installmentCount === 1 ? '' : 's'}
                              </p>
                            </div>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                            >
                              {statusMeta.label}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/contracts?credit=${encodeURIComponent(group.creditId)}`)
                            }
                            className="mt-4 rounded-full bg-[#6B39F4] px-4 py-2 text-sm font-semibold text-white"
                          >
                            View contract
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {showShareOptions && project ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] border border-white/25 bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(238,244,255,0.86))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B39F4]">Share</p>
                <h3 className="mt-2 text-xl font-semibold text-[#0F172A]">{project.title}</h3>
                <p className="mt-2 text-sm text-[#666D80]">Choose how you want to share this venture.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowShareOptions(false)}
                className="rounded-full border border-white/40 bg-white/70 px-3 py-1 text-sm font-semibold text-[#0F172A]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {typeof navigator !== 'undefined' && navigator.share ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.share({ title: project.title, text: shareText, url: getShareUrl() });
                      setShowShareOptions(false);
                    } catch {
                      setShareStatus('Share was cancelled.');
                    }
                  }}
                  className="rounded-[18px] border border-white/25 bg-white/80 px-4 py-4 text-sm font-semibold text-[#0F172A] shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                >
                  Native share
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void copyShareLink()}
                className="rounded-[18px] border border-white/25 bg-white/80 px-4 py-4 text-sm font-semibold text-[#0F172A] shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={() =>
                  openShareWindow(
                    `https://wa.me/?text=${encodeURIComponent(`${shareText} ${getShareUrl()}`)}`
                  )
                }
                className="rounded-[18px] border border-white/25 bg-white/80 px-4 py-4 text-sm font-semibold text-[#0F172A] shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() =>
                  openShareWindow(
                    `https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(shareText)}`
                  )
                }
                className="rounded-[18px] border border-white/25 bg-white/80 px-4 py-4 text-sm font-semibold text-[#0F172A] shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              >
                Telegram
              </button>
              <button
                type="button"
                onClick={() =>
                  openShareWindow(
                    `mailto:?subject=${encodeURIComponent(project.title)}&body=${encodeURIComponent(`${shareText}\n\n${getShareUrl()}`)}`
                  )
                }
                className="col-span-2 rounded-[18px] border border-white/25 bg-white/80 px-4 py-4 text-sm font-semibold text-[#0F172A] shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              >
                Email
              </button>
            </div>

            {shareStatus ? <p className="mt-4 text-sm text-[#6B39F4]">{shareStatus}</p> : null}
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
}
