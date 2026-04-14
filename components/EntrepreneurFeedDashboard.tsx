'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import PageFrame from '@/components/PageFrame';
import { calculateInvestmentProjection } from '@/lib/investment-math';
import { getInvestmentHealth, getInvestmentHealthMeta } from '@/lib/investor-overview';
import {
  expandPaymentScheduleRows,
  getPaymentScheduleStatusMeta,
  normalizePaymentScheduleRecord,
  type PaymentScheduleRecord,
} from '@/lib/payment-schedule';
import { getProjectStatusLabel, getProjectStatusTone } from '@/lib/project-status';
import { fetchCurrentUserInvestments } from '@/utils/client/current-user-investments';
import { fetchCurrentUserPaymentSchedule } from '@/utils/client/current-user-payment-schedule';
import { runUserDirectoryQuery } from '@/utils/supabase/user-directory';

type EntrepreneurProjectRow = {
  id: string | number;
  title: string | null;
  business_name: string | null;
  amount_requested: number | null;
  amount_received: number | null;
  currency: string | null;
  interest_rate: number | null;
  term_months: number | null;
  installment_count: number | null;
  publication_end_date: string | null;
  status: string | null;
};

type InvestmentRow = {
  id: string;
  created_at: string;
  project_id: string;
  investor_user_id: string | null;
  from_wallet: string | null;
  amount?: number | null;
  amount_usdc?: number | null;
  interest_rate_ea: number | null;
  term_months: number | null;
  projected_total_usdc: number | null;
  status: 'submitted' | 'confirmed' | 'failed';
};

type InvestorProfile = {
  id: string;
  name: string | null;
  surname: string | null;
  avatar_url: string | null;
  country: string | null;
  wallet_address: string | null;
};

type SummaryItem = {
  id: string;
  investorUserId: string | null;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  walletAddress: string;
  nextDueDate: Date | null;
  nextDueLabel: string;
  installmentAmount: number;
  healthTone: ReturnType<typeof getInvestmentHealthMeta>;
};

type PaymentScheduleGroup = {
  creditId: string;
  investorUserId: string | null;
  investorName: string;
  investorAvatarUrl: string | null;
  investorCountry: string | null;
  rows: ReturnType<typeof expandPaymentScheduleRows>;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const money = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);

const nameFrom = (profile: InvestorProfile | undefined) => {
  const full = `${profile?.name ?? ''} ${profile?.surname ?? ''}`.trim();
  if (full) return full;
  if (profile?.wallet_address) return `${profile.wallet_address.slice(0, 6)}...`;
  return 'Investor';
};

const initialsFrom = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'I';

const formatDate = (value: Date | null) => {
  if (!value || Number.isNaN(value.getTime())) return 'Pending';
  return value.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getDaysRemaining = (value: string | null | undefined) => {
  if (!value) return 'No deadline';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Pending';

  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Expired';
  if (diffDays === 0) return 'Ends today';
  if (diffDays === 1) return '1 day';
  return `${diffDays} days`;
};

const getNextInstallmentDate = (createdAt: string, termMonths: number | null | undefined) => {
  const start = new Date(createdAt);
  if (Number.isNaN(start.getTime())) return null;

  const totalMonths = Math.max(1, Number(termMonths ?? 1));
  const now = new Date();

  for (let month = 1; month <= totalMonths; month += 1) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + month);
    if (dueDate.getTime() >= now.getTime()) return dueDate;
  }

  const finalDate = new Date(start);
  finalDate.setMonth(finalDate.getMonth() + totalMonths);
  return finalDate;
};

const getInstallmentAmount = (totalRepayment: number, termMonths: number | null | undefined) => {
  const totalMonths = Math.max(1, Number(termMonths ?? 1));
  return Number((totalRepayment / totalMonths).toFixed(2));
};

const buildArcPath = (startAngle: number, endAngle: number, radius = 86, centerX = 120, centerY = 120) => {
  const polarToCartesian = (angle: number) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(radians),
      y: centerY - radius * Math.sin(radians),
    };
  };

  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
};

function FundingGauge({
  raised,
  target,
  currency,
}: {
  raised: number;
  target: number;
  currency: string;
}) {
  const progress = target > 0 ? Math.max(0, Math.min(100, (raised / target) * 100)) : 0;
  const greenProgress = Math.min(progress, 90);
  const finalStretch = Math.max(progress - 90, 0);
  const progressEndAngle = 180 - (greenProgress / 100) * 180;
  const finalEndAngle = 18 - (finalStretch / 10) * 18;

  return (
    <div className="rounded-[28px] border border-white/25 bg-white/20 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
      <div className="flex flex-col items-center text-center">
        <svg viewBox="0 0 240 160" className="h-[180px] w-full max-w-[300px]">
          <path
            d={buildArcPath(180, 0)}
            fill="none"
            stroke="rgba(148,163,184,0.18)"
            strokeWidth="20"
            strokeLinecap="round"
          />
          {greenProgress > 0 ? (
            <path
              d={buildArcPath(180, progressEndAngle)}
              fill="none"
              stroke="#40C4AA"
              strokeWidth="20"
              strokeLinecap="round"
            />
          ) : null}
          {finalStretch > 0 ? (
            <path
              d={buildArcPath(18, finalEndAngle)}
              fill="none"
              stroke="#FFBE4C"
              strokeWidth="20"
              strokeLinecap="round"
            />
          ) : null}
          <text x="28" y="150" className="fill-slate-400 text-[11px] font-semibold">
            0%
          </text>
          <text x="112" y="28" className="fill-slate-400 text-[11px] font-semibold">
            50%
          </text>
          <text x="202" y="150" className="fill-slate-400 text-[11px] font-semibold">
            100%
          </text>
        </svg>

        <div className="-mt-5">
          <p className="text-2xl font-semibold text-slate-900">
            {money(raised, currency)} / {money(target, currency)}
          </p>
          <p className="mt-1 text-sm text-slate-500">Funds raised</p>
        </div>
      </div>
    </div>
  );
}

export default function EntrepreneurFeedDashboard() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const [project, setProject] = useState<EntrepreneurProjectRow | null>(null);
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);
  const [scheduleGroups, setScheduleGroups] = useState<PaymentScheduleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

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

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: authedFetch },
    });
  }, [getAccessToken]);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.id) {
        setProject(null);
        setSummaryItems([]);
        setScheduleGroups([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setStatus('');

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(
          'id,title,business_name,amount_requested,amount_received,currency,interest_rate,term_months,installment_count,publication_end_date,status'
        )
        .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (projectError) {
        setStatus('Could not load your venture dashboard right now.');
        setProject(null);
        setSummaryItems([]);
        setScheduleGroups([]);
        setLoading(false);
        return;
      }

      const currentProject = (projectData as EntrepreneurProjectRow | null) ?? null;
      setProject(currentProject);

      if (!currentProject) {
        setSummaryItems([]);
        setScheduleGroups([]);
        setLoading(false);
        return;
      }

      const projectId = String(currentProject.id);
      const scheduleInstallments = Number(
        currentProject.installment_count ?? currentProject.term_months ?? 1
      );
      const { data: investmentData, error: investmentError } = await fetchCurrentUserInvestments(
        getAccessToken,
        {
          scope: 'entrepreneur',
          projectId,
          statuses: 'submitted,confirmed',
        }
      );

      if (investmentError) {
        setStatus('Could not load your investor summary right now.');
        setSummaryItems([]);
        setLoading(false);
        return;
      }

      const investments = ((investmentData ?? []) as InvestmentRow[]).map((item) => ({
        ...item,
        project_id: String(item.project_id),
        interest_rate_ea: item.interest_rate_ea ?? Number(currentProject.interest_rate ?? 0),
        term_months: item.term_months ?? scheduleInstallments,
        projected_total_usdc:
          item.projected_total_usdc ??
          calculateInvestmentProjection({
            amountUsdc: Number(item.amount ?? 0),
            interestRateEa: Number(currentProject.interest_rate ?? 0),
            termMonths: scheduleInstallments,
          }).projectedTotalUsdc,
      }));

      const investorIds = Array.from(
        new Set(investments.map((investment) => investment.investor_user_id).filter(Boolean))
      ) as string[];

      const profileMap = new Map<string, InvestorProfile>();
      if (investorIds.length > 0) {
        const { data: profilesData } = await runUserDirectoryQuery(supabase, (source) =>
          supabase
            .from(source)
            .select('id,name,surname,avatar_url,country,wallet_address')
            .in('id', investorIds)
        );

        ((profilesData ?? []) as InvestorProfile[]).forEach((profile) => {
          profileMap.set(profile.id, profile);
        });
      }

      const nextScheduleByInvestor = new Map<string, PaymentScheduleRecord>();
      let groupedSchedules: PaymentScheduleGroup[] = [];
      const { data: scheduleData, error: scheduleError } = await fetchCurrentUserPaymentSchedule(
        getAccessToken,
        { projectId }
      );

      if (scheduleError) {
        setStatus('Could not load your payment schedule right now.');
      }

      if (!scheduleError && scheduleData) {
        const normalizedRecords = (scheduleData as Record<string, unknown>[]).map(
          normalizePaymentScheduleRecord
        );

        normalizedRecords.forEach((record) => {
          if (record.investor_user_id && record.status !== 'paid') {
            const current = nextScheduleByInvestor.get(record.investor_user_id);
            const currentTime = current?.next_due_date
              ? new Date(current.next_due_date).getTime()
              : Number.MAX_SAFE_INTEGER;
            const recordTime = record.next_due_date
              ? new Date(record.next_due_date).getTime()
              : Number.MAX_SAFE_INTEGER;
            if (!current || recordTime < currentTime) {
              nextScheduleByInvestor.set(record.investor_user_id, record);
            }
          }
        });

        groupedSchedules = normalizedRecords
          .map((record) => {
            const investorUserId = record.investor_user_id ?? null;
            const investor = investorUserId ? profileMap.get(investorUserId) : undefined;
            return {
              creditId: record.credit_id,
              investorUserId,
              investorName: nameFrom(investor),
              investorAvatarUrl: investor?.avatar_url ?? null,
              investorCountry: investor?.country ?? null,
              rows: expandPaymentScheduleRows(record),
            };
          })
          .sort((a, b) => {
            const left = a.rows[0]?.due_date
              ? new Date(a.rows[0].due_date ?? '').getTime()
              : Number.MAX_SAFE_INTEGER;
            const right = b.rows[0]?.due_date
              ? new Date(b.rows[0].due_date ?? '').getTime()
              : Number.MAX_SAFE_INTEGER;
            return left - right;
          });
      }

      const items = investments
        .filter((investment) => Boolean(investment.from_wallet))
        .map((investment) => {
          const investor = investment.investor_user_id
            ? profileMap.get(investment.investor_user_id)
            : undefined;
          const scheduleSnapshot = investment.investor_user_id
            ? nextScheduleByInvestor.get(investment.investor_user_id)
            : undefined;
          const totalRepayment =
            Number(investment.projected_total_usdc ?? 0) ||
            calculateInvestmentProjection({
              amountUsdc: Number(investment.amount ?? 0),
              interestRateEa: Number(investment.interest_rate_ea ?? currentProject.interest_rate ?? 0),
              termMonths: Number(
                investment.term_months ?? currentProject.installment_count ?? currentProject.term_months ?? 0
              ),
            }).projectedTotalUsdc;
          const nextDueDate = scheduleSnapshot?.next_due_date
            ? new Date(scheduleSnapshot.next_due_date)
            : getNextInstallmentDate(
                investment.created_at,
                investment.term_months ?? currentProject.installment_count ?? currentProject.term_months
              );
          const health = getInvestmentHealth(nextDueDate);

          return {
            id: investment.id,
            investorUserId: investment.investor_user_id,
            displayName: nameFrom(investor),
            avatarUrl: investor?.avatar_url ?? null,
            country: investor?.country ?? null,
            walletAddress: investor?.wallet_address ?? investment.from_wallet ?? '',
            nextDueDate,
            nextDueLabel: formatDate(nextDueDate),
            installmentAmount:
              scheduleSnapshot?.current_installment_amount ??
              getInstallmentAmount(
                totalRepayment,
                investment.term_months ?? currentProject.installment_count ?? currentProject.term_months
              ),
            healthTone: getInvestmentHealthMeta(health),
          };
        })
        .sort((a, b) => {
          const left = a.nextDueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
          const right = b.nextDueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
          return left - right;
        });

      setSummaryItems(items);
      setScheduleGroups(groupedSchedules);
      setLoading(false);
    };

    void loadDashboard();
  }, [getAccessToken, supabase, user?.id]);

  const targetAmount = Number(project?.amount_requested ?? 0);
  const raisedAmount = Number(project?.amount_received ?? 0);
  const currency = project?.currency ?? 'USD';
  const businessName = project?.business_name || project?.title || 'Your venture';
  const infoRows = [
    { label: 'Funding goal', value: money(targetAmount, currency) },
    { label: 'Funds raised', value: money(raisedAmount, currency) },
    {
      label: 'Interest rate',
      value: project?.interest_rate ? `${project.interest_rate}% EA` : '--',
    },
    {
      label: 'Days remaining',
      value: getDaysRemaining(project?.publication_end_date),
    },
    {
      label: 'Publication status',
      value: project ? getProjectStatusLabel(project) : '--',
      tone: project ? getProjectStatusTone(project) : '',
    },
  ];

  return (
    <PageFrame title="My venture" subtitle="Funding progress and investor summary">
      {loading ? <p className="text-sm text-gray-500">Loading your dashboard...</p> : null}
      {status ? <p className="mb-4 text-sm text-gray-500">{status}</p> : null}

      {!loading && !project ? (
        <div className="rounded-[24px] border border-white/25 bg-white/20 p-5 text-sm text-gray-600 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
          Publish your venture first and this dashboard will show your fundraising progress here.
        </div>
      ) : null}

      {!loading && project ? (
        <div className="space-y-5 pb-8">
          <div className="rounded-[28px] border border-white/25 bg-white/20 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Venture dashboard</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{businessName}</h2>
            <p className="mt-1 text-sm text-slate-500">Track your fundraising and stay on top of investor repayments.</p>
          </div>

          <FundingGauge raised={raisedAmount} target={targetAmount} currency={currency} />

          <section className="rounded-[28px] border border-white/25 bg-white/20 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <div className="space-y-3">
              {infoRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/20 px-4 py-3"
                >
                  <span className="text-sm text-slate-500">{row.label}</span>
                  <span
                    className={`text-sm font-semibold text-slate-900 ${
                      row.tone ? `rounded-full border px-3 py-1 ${row.tone}` : ''
                    }`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/25 bg-white/20 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Summary</h3>
                <p className="text-sm text-slate-500">
                  {summaryItems.length} investor{summaryItems.length === 1 ? '' : 's'} supporting this venture
                </p>
              </div>
            </div>

            <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {summaryItems.length === 0 ? (
                <div className="rounded-[22px] border border-white/20 bg-white/20 p-4 text-sm text-slate-500">
                  No investors yet. Once funding starts, each investor will appear here with the next payment due date.
                </div>
              ) : (
                summaryItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-[22px] border border-white/20 bg-white/20 p-4"
                  >
                    <div className="h-14 w-14 overflow-hidden rounded-full border border-white/25 bg-white/20">
                      {item.avatarUrl ? (
                        <img
                          src={item.avatarUrl}
                          alt={item.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
                          {initialsFrom(item.displayName)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{item.displayName}</p>
                          <p className="truncate text-xs text-slate-500">{item.country || 'Country pending'}</p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${item.healthTone.badgeClass}`}
                        >
                          {item.healthTone.label}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Due date</p>
                          <p className="text-xs font-semibold text-slate-700">{item.nextDueLabel}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Installment</p>
                          <p className={`text-sm font-semibold ${item.healthTone.textClass}`}>
                            {money(item.installmentAmount, currency)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/invest/wallet?mode=repayment&wallet=${encodeURIComponent(
                                item.walletAddress
                              )}&amount=${encodeURIComponent(
                                item.installmentAmount.toFixed(2)
                              )}&name=${encodeURIComponent(
                                item.displayName
                              )}&projectId=${encodeURIComponent(project.id)}&investorUserId=${encodeURIComponent(
                                item.investorUserId ?? ''
                              )}`
                            )
                          }
                          disabled={!item.walletAddress}
                          className={`rounded-full px-4 py-2 text-xs font-semibold ${
                            item.walletAddress
                              ? 'bg-[#6B39F4] text-white'
                              : 'bg-[#6B39F4]/30 text-white/60'
                          }`}
                        >
                          Pay
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/25 bg-white/20 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Contracts</h3>
              <p className="text-sm text-slate-500">
                Open each investment contract in its own page to review the generated smart
                contract and full amortization table.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {scheduleGroups.length === 0 ? (
                <div className="rounded-[22px] border border-white/20 bg-white/20 p-4 text-sm text-slate-500">
                  Contracts will appear here once an investment is registered and the payment
                  schedule is available in Supabase.
                </div>
              ) : (
                scheduleGroups.map((group) => {
                  const activeRow =
                    group.rows.find((row) => row.status !== 'paid') ??
                    group.rows[group.rows.length - 1] ??
                    null;
                  const activeStatus = getPaymentScheduleStatusMeta(activeRow?.status ?? null);
                  const nextDueDate =
                    activeRow?.due_date && !Number.isNaN(new Date(activeRow.due_date).getTime())
                      ? new Date(activeRow.due_date)
                      : null;

                  return (
                    <div
                      key={group.creditId}
                      className="rounded-[24px] border border-white/25 bg-white/30 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-full border border-white/25 bg-white/20">
                          {group.investorAvatarUrl ? (
                            <img
                              src={group.investorAvatarUrl}
                              alt={group.investorName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
                              {initialsFrom(group.investorName)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {group.investorName}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {group.investorCountry || 'Country pending'}
                              </p>
                            </div>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${activeStatus.className}`}
                            >
                              {activeStatus.label}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-2xl border border-white/20 bg-white/25 px-3 py-3">
                              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                Next due
                              </p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {formatDate(nextDueDate)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white/20 bg-white/25 px-3 py-3">
                              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                Installments
                              </p>
                              <p className="mt-1 font-semibold text-slate-900">{group.rows.length}</p>
                            </div>
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
                      </div>
                    </div>
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
