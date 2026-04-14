'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import PageFrame from '@/components/PageFrame';
import {
  formatNextRepaymentDate,
  getInvestmentHealth,
  getInvestmentHealthMeta,
  getNextRepaymentDate,
  type InvestmentHealth,
} from '@/lib/investor-overview';
import { calculateInvestmentProjection } from '@/lib/investment-math';
import {
  detectInvestmentsSchema,
  loadLegacyInvestmentsForInvestor,
} from '@/lib/supabase-ledger-compat';
import { getAmountValue, runWithAmountColumnFallback } from '@/lib/supabase-amount';
import { useInvestApp } from '@/lib/investapp-context';
import { runUserDirectoryQuery } from '@/utils/supabase/user-directory';

type InvestmentRow = {
  id: string;
  created_at: string;
  project_id: string;
  amount?: number | null;
  amount_usdc?: number | null;
  interest_rate_ea: number | null;
  term_months: number | null;
  projected_return_usdc: number | null;
  projected_total_usdc: number | null;
  status: 'submitted' | 'confirmed' | 'failed';
};

type ProjectRow = {
  id: string;
  title: string;
  business_name: string | null;
  photo_urls: string[] | null;
  owner_user_id: string | null;
  interest_rate: number | null;
  term_months: number | null;
  installment_count: number | null;
};

type OwnerRow = {
  id: string;
  name: string | null;
  surname: string | null;
};

type PortfolioItem = {
  id: string;
  createdAt: string;
  projectId: string;
  businessName: string;
  ownerName: string;
  coverImage: string | null;
  amountInvested: number;
  interestRateEa: number | null;
  projectedReturnUsdc: number;
  nextRepaymentDate: Date | null;
  nextRepaymentLabel: string;
  health: InvestmentHealth;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const CHART_COLORS = ['#40C4AA', '#6B39F4', '#FFBE4C', '#3290FF', '#DF1C41', '#0EA5A4'];

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);

const percent = (value: number) => `${value.toFixed(1)}%`;

const normalizePhotos = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

const ownerNameFrom = (owner: OwnerRow | undefined) => {
  const full = `${owner?.name ?? ''} ${owner?.surname ?? ''}`.trim();
  if (full) return full;
  return 'Business owner';
};

function DonutChart({ items, total }: { items: PortfolioItem[]; total: number }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  let progress = 0;

  return (
    <div className="relative flex h-[150px] w-[150px] items-center justify-center">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="18" />
        {items.length > 0
          ? items.map((item, index) => {
              const ratio = total > 0 ? item.amountInvested / total : 0;
              const dash = circumference * ratio;
              const element = (
                <circle
                  key={item.id}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth="18"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-progress}
                  strokeLinecap="round"
                />
              );
              progress += dash;
              return element;
            })
          : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Portfolio</p>
        <p className="mt-2 text-lg font-semibold text-gray-900">{money(total)}</p>
      </div>
    </div>
  );
}

export default function InvestorPortfolioDashboard() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp } = useInvestApp();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [filter, setFilter] = useState<'all' | InvestmentHealth>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'amount' | 'share' | 'repayment'>('latest');

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
      return shouldFallback ? run(baseHeaders) : response;
    };

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { fetch: authedFetch } });
  }, [getAccessToken]);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.id) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setStatus('');

      const investmentSchema = await detectInvestmentsSchema(supabase);
      let investments: InvestmentRow[] = [];

      if (investmentSchema === 'legacy') {
        const { data: legacyData, error: legacyError } = await loadLegacyInvestmentsForInvestor(
          supabase,
          user.id
        );

        if (legacyError) {
          setStatus('Could not load your investments right now. Please try again in a moment.');
          setItems([]);
          setLoading(false);
          return;
        }

        investments = legacyData.map((item) => ({
          id: item.id,
          created_at: item.created_at,
          project_id: item.project_id,
          amount: item.amount,
          amount_usdc: item.amount,
          interest_rate_ea: null,
          term_months: null,
          projected_return_usdc: null,
          projected_total_usdc: null,
          status: item.status,
        }));
      } else {
        const { data, error } = await runWithAmountColumnFallback((amountColumn) =>
          supabase
            .from('investments')
            .select(
              `id,created_at,project_id,${amountColumn},interest_rate_ea,term_months,projected_return_usdc,projected_total_usdc,status`
            )
            .eq('investor_user_id', user.id)
            .in('status', ['submitted', 'confirmed'])
            .order('created_at', { ascending: false })
        );

        if (error) {
          setStatus('Could not load your investments right now. Please try again in a moment.');
          setItems([]);
          setLoading(false);
          return;
        }

        investments = ((data ?? []) as InvestmentRow[]).map((item) => ({
          ...item,
          amount: getAmountValue(item),
        }));
      }

      const projectIds = Array.from(new Set(investments.map((item) => item.project_id).filter(Boolean)));

      const projectMap = new Map<string, ProjectRow>();
      if (projectIds.length > 0) {
        const normalizedProjectIds = projectIds.map((projectId) => {
          const numericValue = Number(projectId);
          return Number.isFinite(numericValue) ? numericValue : projectId;
        });
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id,title,business_name,photo_urls,owner_user_id,interest_rate,term_months,installment_count')
          .in('id', normalizedProjectIds);
        ((projectsData ?? []) as ProjectRow[]).forEach((project) => {
          projectMap.set(String(project.id), {
            ...project,
            id: String(project.id),
            photo_urls: normalizePhotos(project.photo_urls),
          });
        });
      }

      const ownerIds = Array.from(
        new Set(
          [...projectMap.values()].map((project) => project.owner_user_id).filter(Boolean)
        )
      ) as string[];
      const ownerMap = new Map<string, OwnerRow>();
      if (ownerIds.length > 0) {
        const { data: ownersData } = await runUserDirectoryQuery(supabase, (source) =>
          supabase.from(source).select('id,name,surname').in('id', ownerIds)
        );
        ((ownersData ?? []) as OwnerRow[]).forEach((owner) => ownerMap.set(owner.id, owner));
      }

      setItems(
        investments.map((investment) => {
          const project = projectMap.get(investment.project_id);
          const repaymentInstallments = investment.term_months ?? project?.installment_count ?? project?.term_months ?? 0;
          const nextRepaymentDate = getNextRepaymentDate(
            investment.created_at,
            repaymentInstallments
          );
          const projection =
            investment.projected_return_usdc != null
              ? {
                  projectedReturnUsdc: Number(investment.projected_return_usdc),
                }
              : calculateInvestmentProjection({
                  amountUsdc: Number(investment.amount ?? 0),
                  interestRateEa: Number(
                    investment.interest_rate_ea ?? project?.interest_rate ?? 0
                  ),
                  termMonths: Number(repaymentInstallments),
                });
          return {
            id: investment.id,
            createdAt: investment.created_at,
            projectId: investment.project_id,
            businessName: project?.business_name || project?.title || 'Business',
            ownerName: ownerNameFrom(
              project?.owner_user_id ? ownerMap.get(project.owner_user_id) : undefined
            ),
            coverImage: project?.photo_urls?.[0] ?? null,
            amountInvested: Number(investment.amount ?? 0),
            interestRateEa: investment.interest_rate_ea ?? project?.interest_rate ?? null,
            projectedReturnUsdc: Number(projection.projectedReturnUsdc ?? 0),
            nextRepaymentDate,
            nextRepaymentLabel: formatNextRepaymentDate(nextRepaymentDate),
            health: getInvestmentHealth(nextRepaymentDate),
          };
        })
      );
      setLoading(false);
    };

    void loadDashboard();
  }, [supabase, user?.id]);

  const totalPortfolio = useMemo(
    () => items.reduce((sum, item) => sum + item.amountInvested, 0),
    [items]
  );
  const averageRate = useMemo(() => {
    if (totalPortfolio <= 0) return 0;
    const weightedTotal = items.reduce(
      (sum, item) => sum + item.amountInvested * Number(item.interestRateEa ?? 0),
      0
    );
    return weightedTotal / totalPortfolio;
  }, [items, totalPortfolio]);
  const accumulatedEarnings = useMemo(
    () => items.reduce((sum, item) => sum + item.projectedReturnUsdc, 0),
    [items]
  );

  const filteredItems = useMemo(() => {
    const nextItems = filter === 'all' ? items : items.filter((item) => item.health === filter);
    return [...nextItems].sort((a, b) => {
      if (sortBy === 'amount') return b.amountInvested - a.amountInvested;
      if (sortBy === 'share') return b.amountInvested - a.amountInvested;
      if (sortBy === 'repayment') {
        return (a.nextRepaymentDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.nextRepaymentDate?.getTime() ?? Number.MAX_SAFE_INTEGER);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filter, items, sortBy]);

  return (
    <PageFrame title="My investments" subtitle="Portfolio summary and venture follow-up">
      {loading ? <p className="text-sm text-gray-500">Loading your investment dashboard...</p> : null}
      {status ? <p className="mb-4 text-sm text-rose-600">{status}</p> : null}

      {!loading ? (
        <div className="space-y-5 pb-8">
          <div className="rounded-[24px] border border-white/25 bg-white/20 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <DonutChart items={items} total={totalPortfolio} />
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/25 bg-white/25 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Total portfolio</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">{money(totalPortfolio)}</p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/25 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Average rate</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">{percent(averageRate)}</p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/25 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Accumulated earnings</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">{money(accumulatedEarnings)}</p>
                </div>
              </div>
            </div>
          </div>

          <section className="rounded-[24px] border border-white/25 bg-white/20 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
                <p className="text-sm text-gray-500">{filteredItems.length} ventures in your portfolio</p>
              </div>
              <div className="flex gap-3">
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as 'all' | InvestmentHealth)}
                  className="rounded-full border border-white/25 bg-white/25 px-4 py-2 text-sm text-gray-700 outline-none"
                >
                  <option value="all">All status</option>
                  <option value="up_to_date">Up to date</option>
                  <option value="due_soon">Due soon</option>
                  <option value="overdue">Overdue</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as 'latest' | 'amount' | 'share' | 'repayment')}
                  className="rounded-full border border-white/25 bg-white/25 px-4 py-2 text-sm text-gray-700 outline-none"
                >
                  <option value="latest">Latest</option>
                  <option value="amount">Highest amount</option>
                  <option value="share">Highest participation</option>
                  <option value="repayment">Nearest repayment</option>
                </select>
              </div>
            </div>

            <div className="mt-5 max-h-[460px] space-y-3 overflow-y-auto pr-1">
              {filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-white/25 bg-white/25 p-4 text-sm text-gray-500">
                  {items.length === 0
                    ? 'You do not have investments yet. Once you fund a venture, it will appear here.'
                    : 'No investments found for the selected filter.'}
                </div>
              ) : (
                filteredItems.map((item) => {
                  const share = totalPortfolio > 0 ? (item.amountInvested / totalPortfolio) * 100 : 0;
                  const tone = getInvestmentHealthMeta(item.health);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => router.push(`/feed/${item.projectId}`)}
                      className="w-full rounded-[22px] border border-white/25 bg-white/25 p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:bg-white/35"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/25 bg-white/20">
                          {item.coverImage ? (
                            <img src={item.coverImage} alt={item.businessName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary">
                              {item.businessName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="truncate text-sm font-semibold text-gray-900">{item.businessName}</p>
                              <p className="mt-1 text-xs text-gray-500">Owner: {item.ownerName}</p>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${tone.badgeClass}`}>
                              {tone.label}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                            <span className={`font-semibold ${tone.textClass}`}>{money(item.amountInvested)}</span>
                            <span className="text-xs text-gray-500">Next repayment: {item.nextRepaymentLabel}</span>
                          </div>

                          <div className="mt-3 flex items-center gap-3">
                            <div className={`h-2 flex-1 overflow-hidden rounded-full ${tone.trackClass}`}>
                              <div className={`h-full rounded-full ${tone.fillClass}`} style={{ width: `${share}%` }} />
                            </div>
                            <span className={`min-w-[52px] text-right text-xs font-semibold ${tone.textClass}`}>
                              {percent(share)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>
      ) : null}
    </PageFrame>
  );
}
