'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import BottomNav from '@/components/BottomNav';
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
import { fetchCurrentUserProjects } from '@/utils/client/current-user-projects';
import { runUserDirectoryQuery } from '@/utils/supabase/user-directory';

type EntrepreneurProjectRow = {
  id: string | number;
  title: string | null;
  business_name: string | null;
  description: string | null;
  photo_urls: string[] | null;
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

type DashboardCardProps = {
  children: React.ReactNode;
  className?: string;
};

type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
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
    minimumFractionDigits: 2,
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

const buildArcPath = (startAngle: number, endAngle: number, radius = 102, centerX = 140, centerY = 148) => {
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

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
    .join('')}`;

const mixColors = (left: string, right: string, ratio: number) => {
  const a = hexToRgb(left);
  const b = hexToRgb(right);
  const weight = Math.max(0, Math.min(1, ratio));

  return rgbToHex({
    r: a.r + (b.r - a.r) * weight,
    g: a.g + (b.g - a.g) * weight,
    b: a.b + (b.b - a.b) * weight,
  });
};

const GAUGE_COLOR_STOPS = [
  { stop: 0, color: '#FF7A6B' },
  { stop: 0.3, color: '#FFB547' },
  { stop: 0.7, color: '#9DDD4F' },
  { stop: 1, color: '#35C982' },
] as const;

const interpolateGaugeColor = (progressRatio: number) => {
  const ratio = Math.max(0, Math.min(1, progressRatio));

  for (let index = 0; index < GAUGE_COLOR_STOPS.length - 1; index += 1) {
    const current = GAUGE_COLOR_STOPS[index];
    const next = GAUGE_COLOR_STOPS[index + 1];

    if (ratio <= next.stop) {
      const localRatio = (ratio - current.stop) / (next.stop - current.stop || 1);
      return mixColors(current.color, next.color, localRatio);
    }
  }

  return GAUGE_COLOR_STOPS[GAUGE_COLOR_STOPS.length - 1].color;
};

function DashboardCard({ children, className = '' }: DashboardCardProps) {
  return (
    <section
      className={`relative rounded-[30px] border border-white/85 bg-white/88 p-4 shadow-[0_24px_70px_rgba(31,38,64,0.10)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeading({ title, subtitle, actionLabel = 'View all' }: SectionHeadingProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-[1rem] font-semibold tracking-[-0.03em] text-[#1C2336]">{title}</h3>
        {subtitle ? (
          <p className="mt-1 text-xs leading-5 text-[#7B879C]">{subtitle}</p>
        ) : null}
      </div>
      <span className="shrink-0 text-xs font-semibold text-[#6B39F4]">{actionLabel}</span>
    </div>
  );
}

function Avatar({
  imageUrl,
  label,
  className = '',
}: {
  imageUrl?: string | null;
  label: string;
  className?: string;
}) {
  return imageUrl ? (
    <div
      role="img"
      aria-label={label}
      className={`overflow-hidden rounded-full bg-[#EDE8FF] bg-cover bg-center ${className}`}
      style={{ backgroundImage: `url("${imageUrl}")` }}
    />
  ) : (
    <div
      className={`flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] text-sm font-semibold text-white shadow-[0_14px_28px_rgba(107,57,244,0.20)] ${className}`}
      aria-label={label}
    >
      {initialsFrom(label)}
    </div>
  );
}

function IconMenu() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 7H17" />
      <path d="M10 12H17" />
      <path d="M13 17H17" />
      <path d="M7 7H7.01" />
      <path d="M7 12H7.01" />
      <path d="M7 17H7.01" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="6.5" width="17" height="11" rx="3" />
      <path d="M15.5 10.5h5" />
      <path d="M16.5 12h.01" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.5" />
    </svg>
  );
}

function IconPercent() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 19L19 5" />
      <circle cx="7" cy="7" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 4v2.5" />
      <path d="M20 12h-2.5" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 19V9" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
    </svg>
  );
}

function IconArrowRight() {
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
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function FundingGauge({
  raised,
  target,
  remaining,
  currency,
  daysRemainingLabel,
}: {
  raised: number;
  target: number;
  remaining: number;
  currency: string;
  daysRemainingLabel: string;
}) {
  const gaugeId = useId().replace(/:/g, '');
  const progressRatio = target > 0 ? Math.max(0, Math.min(1, raised / target)) : 0;
  const [animatedRatio, setAnimatedRatio] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setAnimatedRatio(progressRatio);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [progressRatio]);

  const progressColor = interpolateGaugeColor(animatedRatio);
  const leadingColor = mixColors(progressColor, '#FFFFFF', 0.22);
  const trailingColor =
    animatedRatio >= 0.7 ? mixColors(progressColor, '#16A34A', 0.25) : mixColors(progressColor, '#7C5CFF', 0.18);
  const glowOpacity = 0.28 + animatedRatio * 0.42;
  const glowBlur = 6 + animatedRatio * 4;
  const percentageLabel = `${(animatedRatio * 100).toFixed(2)}%`;

  return (
    <DashboardCard className="overflow-hidden border-white/12 bg-[linear-gradient(180deg,#1A1744_0%,#211A57_42%,#15133A_100%)] p-5 text-white shadow-[0_30px_70px_rgba(17,24,39,0.28)] ring-1 ring-white/10">
      <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-[radial-gradient(circle_at_50%_16%,rgba(124,92,255,0.38),transparent_42%),radial-gradient(circle_at_50%_100%,rgba(53,201,130,0.18),transparent_34%)]" />
      <div className="pointer-events-none absolute -left-16 top-10 h-36 w-36 rounded-full bg-[#7C5CFF]/18 blur-3xl" />
      <div className="pointer-events-none absolute -right-12 bottom-4 h-28 w-28 rounded-full bg-[#35C982]/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/55">
              Funds raised
            </p>
            <p className="mt-2 text-[1.45rem] font-semibold tracking-[-0.04em] text-white">
              {money(raised, currency)}
            </p>
            <p className="mt-1 text-xs text-white/55">of {money(target, currency)} goal</p>
          </div>

          <div className="text-right">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/55">
              Remaining
            </p>
            <p className="mt-2 text-[1.45rem] font-semibold tracking-[-0.04em] text-white">
              {money(remaining, currency)}
            </p>
            <p className="mt-1 text-xs text-white/55">to go</p>
          </div>
        </div>

        <div className="relative mt-4">
          <svg viewBox="0 0 280 190" className="mx-auto h-[210px] w-full max-w-[320px]">
            <defs>
              <linearGradient id={`gauge-gradient-${gaugeId}`} x1="30" y1="160" x2="250" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={leadingColor} />
                <stop offset="55%" stopColor={progressColor} />
                <stop offset="100%" stopColor={trailingColor} />
              </linearGradient>
              <filter id={`gauge-glow-${gaugeId}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={glowBlur} result="blur" />
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${glowOpacity.toFixed(2)} 0`}
                />
              </filter>
            </defs>

            <path
              d={buildArcPath(180, 0)}
              pathLength={100}
              fill="none"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth="18"
              strokeLinecap="round"
            />
            <path
              d={buildArcPath(180, 0)}
              pathLength={100}
              fill="none"
              stroke={`url(#gauge-gradient-${gaugeId})`}
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray="100"
              strokeDashoffset={100 - animatedRatio * 100}
              filter={`url(#gauge-glow-${gaugeId})`}
              className="transition-[stroke-dashoffset] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
            />
            <path
              d={buildArcPath(180, 0)}
              pathLength={100}
              fill="none"
              stroke={`url(#gauge-gradient-${gaugeId})`}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="100"
              strokeDashoffset={100 - animatedRatio * 100}
              className="transition-[stroke-dashoffset] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
            />

            <text x="27" y="168" className="fill-white/45 text-[11px] font-semibold">
              0%
            </text>
            <text x="132" y="34" className="fill-white/45 text-[11px] font-semibold">
              50%
            </text>
            <text x="230" y="168" className="fill-white/45 text-[11px] font-semibold">
              100%
            </text>
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-7 text-center">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/55">
              Funding progress
            </p>
            <p className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-white">
              {percentageLabel}
            </p>
          </div>
        </div>

        <div className="-mt-4 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-white/55" />
            {daysRemainingLabel} left
          </span>
        </div>
      </div>
    </DashboardCard>
  );
}

function MetricTile({
  icon,
  label,
  value,
  accent = 'purple',
  badgeClassName = '',
  fullWidth = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: 'purple' | 'blue' | 'green' | 'amber';
  badgeClassName?: string;
  fullWidth?: boolean;
}) {
  const accentClassMap = {
    purple: 'bg-[#F5F1FF] text-[#6B39F4]',
    blue: 'bg-[#EEF4FF] text-[#4C6EF5]',
    green: 'bg-[#EEF9F2] text-[#14845A]',
    amber: 'bg-[#FFF7E8] text-[#C77C00]',
  } as const;

  return (
    <div
      className={`rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 shadow-[0_16px_32px_rgba(31,38,64,0.05)] ${fullWidth ? 'col-span-2' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-[0_10px_20px_rgba(107,57,244,0.08)] ${accentClassMap[accent]}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8A93A8]">
            {label}
          </p>
          <div className="mt-2">
            <span
              className={`text-sm font-semibold text-[#1C2336] ${badgeClassName ? `inline-flex rounded-full border px-3 py-1 ${badgeClassName}` : ''}`}
            >
              {value}
            </span>
          </div>
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

      const { data: projectData, error: projectError } = await fetchCurrentUserProjects(
        getAccessToken,
        { limit: 1 }
      );

      if (projectError) {
        setStatus('Could not load your venture dashboard right now.');
        setProject(null);
        setSummaryItems([]);
        setScheduleGroups([]);
        setLoading(false);
        return;
      }

      const currentProject = ((projectData ?? [])[0] as EntrepreneurProjectRow | undefined) ?? null;
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
  const remainingAmount = Math.max(targetAmount - raisedAmount, 0);
  const currency = project?.currency ?? 'USD';
  const businessName = project?.business_name || project?.title || 'Your venture';
  const ventureDescription =
    project?.description?.trim() || 'Track your fundraising and stay on top of investor repayments.';
  const heroImage = project?.photo_urls?.[0] ?? null;
  const daysRemainingLabel = getDaysRemaining(project?.publication_end_date);

  const infoRows = [
    {
      label: 'Funding goal',
      value: money(targetAmount, currency),
      icon: <IconTarget />,
      accent: 'purple' as const,
    },
    {
      label: 'Funds raised',
      value: money(raisedAmount, currency),
      icon: <IconWallet />,
      accent: 'green' as const,
    },
    {
      label: 'Interest rate',
      value: project?.interest_rate ? `${project.interest_rate}% EA` : '--',
      icon: <IconPercent />,
      accent: 'amber' as const,
    },
    {
      label: 'Days remaining',
      value: daysRemainingLabel,
      icon: <IconClock />,
      accent: 'blue' as const,
    },
    {
      label: 'Remaining amount',
      value: money(remainingAmount, currency),
      icon: <IconChart />,
      accent: 'purple' as const,
    },
    {
      label: 'Status',
      value: project ? getProjectStatusLabel(project) : '--',
      icon: <IconChart />,
      accent: 'green' as const,
      badgeClassName: project ? getProjectStatusTone(project) : '',
    },
  ];

  return (
    <>
      <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.16),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F5F6FC_52%,#F7F8FD_100%)] pb-36 text-[#101828]">
        <div className="pointer-events-none absolute left-1/2 top-[-9rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 top-56 h-64 w-64 rounded-full bg-[#B9A8FF]/16 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-[32rem] h-64 w-64 rounded-full bg-[#7DE0B8]/8 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-8 pt-10">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-0.5 text-[1.9rem] font-semibold tracking-[-0.07em] text-[#1C2336]">
                <span>Invest</span>
                <span className="text-[#6B39F4]">App</span>
                <span className="ml-0.5 mt-0.5 h-3 w-3 rounded-full bg-[#6B39F4]" />
              </div>
              <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#8A93A8]">
                Entrepreneur dashboard
              </p>
              <h1 className="mt-1 text-[2rem] font-semibold tracking-[-0.065em] text-[#1C2336]">
                My venture
              </h1>
              <p className="mt-1 text-sm leading-6 text-[#7B879C]">
                Funding progress and investor summary
              </p>
            </div>

            <button
              type="button"
              aria-label="Open menu"
              onClick={() => router.push('/profile/settings')}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/90 bg-white/86 text-[#6B39F4] shadow-[0_18px_36px_rgba(31,38,64,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white"
            >
              <IconMenu />
            </button>
          </header>

          {loading ? (
            <DashboardCard className="text-sm text-[#7B879C]">
              Loading your dashboard...
            </DashboardCard>
          ) : null}

          {status ? (
            <DashboardCard className="text-sm text-[#7B879C]">{status}</DashboardCard>
          ) : null}

          {!loading && !project ? (
            <DashboardCard className="text-sm text-[#667085]">
              Publish your venture first and this dashboard will show your fundraising progress here.
            </DashboardCard>
          ) : null}

          {!loading && project ? (
            <div className="flex flex-col gap-4 pb-2">
              <DashboardCard className="overflow-hidden border-white/12 bg-[linear-gradient(140deg,#2B2370_0%,#2E2A7D_42%,#23224C_100%)] p-5 text-white shadow-[0_30px_70px_rgba(17,24,39,0.28)] ring-1 ring-white/10">
                <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(124,92,255,0.34),transparent_26%),radial-gradient(circle_at_75%_80%,rgba(53,201,130,0.12),transparent_28%)]" />
                <div className="relative flex items-center gap-4">
                  <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-white/12 bg-[linear-gradient(135deg,#5A3FF0_0%,#221E4F_100%)] shadow-[0_18px_38px_rgba(7,10,23,0.32)]">
                    {heroImage ? (
                      <div
                        role="img"
                        aria-label={businessName}
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url("${heroImage}")` }}
                      />
                    ) : (
                      <span className="text-lg font-semibold tracking-[0.08em] text-white">
                        {initialsFrom(businessName)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/55">
                      Venture dashboard
                    </p>
                    <h2 className="mt-2 text-[1.42rem] font-semibold tracking-[-0.04em] text-white">
                      {businessName}
                    </h2>
                    <p className="mt-2 text-sm leading-5 text-white/72">
                      {ventureDescription}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/feed/${encodeURIComponent(String(project.id))}`)}
                  className="relative mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/14 bg-white/12 px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(7,10,23,0.20)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/16"
                >
                  View venture
                  <IconArrowRight />
                </button>
              </DashboardCard>

              <FundingGauge
                raised={raisedAmount}
                target={targetAmount}
                remaining={remainingAmount}
                currency={currency}
                daysRemainingLabel={daysRemainingLabel}
              />

              <DashboardCard>
                <div className="grid grid-cols-2 gap-3">
                  {infoRows.map((row) => (
                    <MetricTile
                      key={row.label}
                      icon={row.icon}
                      label={row.label}
                      value={row.value}
                      accent={row.accent}
                      badgeClassName={row.badgeClassName}
                    />
                  ))}
                </div>
              </DashboardCard>

              <DashboardCard>
                <SectionHeading
                  title="Summary"
                  subtitle={`${summaryItems.length} investor${summaryItems.length === 1 ? '' : 's'} supporting this venture`}
                />

                <div className="mt-4 flex flex-col gap-3">
                  {summaryItems.length === 0 ? (
                    <div className="rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 text-sm leading-6 text-[#7B879C] shadow-[0_16px_32px_rgba(31,38,64,0.05)]">
                      No investors yet. Once funding starts, each investor will appear here with the next payment due date.
                    </div>
                  ) : (
                    summaryItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[26px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 shadow-[0_16px_32px_rgba(31,38,64,0.05)]"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar
                            imageUrl={item.avatarUrl}
                            label={item.displayName}
                            className="h-14 w-14 shrink-0 border border-white shadow-[0_10px_20px_rgba(31,38,64,0.08)]"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#1C2336]">
                                  {item.displayName}
                                </p>
                                <p className="mt-1 truncate text-xs text-[#7B879C]">
                                  {item.country || 'Country pending'}
                                </p>
                              </div>
                              <span
                                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${item.healthTone.badgeClass}`}
                              >
                                {item.healthTone.label}
                              </span>
                            </div>

                            <div className="mt-4 flex items-end justify-between gap-3">
                              <div className="flex gap-6">
                                <div>
                                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                                    Due date
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-[#1C2336]">
                                    {item.nextDueLabel}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                                    Installment
                                  </p>
                                  <p className={`mt-1 text-xs font-semibold ${item.healthTone.textClass}`}>
                                    {money(item.installmentAmount, currency)}
                                  </p>
                                </div>
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
                                    )}&projectId=${encodeURIComponent(
                                      String(project.id)
                                    )}&investorUserId=${encodeURIComponent(item.investorUserId ?? '')}`
                                  )
                                }
                                disabled={!item.walletAddress}
                                className={`flex min-h-[40px] shrink-0 items-center justify-center rounded-full px-4 text-xs font-semibold transition ${
                                  item.walletAddress
                                    ? 'bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] text-white shadow-[0_14px_24px_rgba(107,57,244,0.24)] hover:-translate-y-0.5'
                                    : 'bg-[#E7E4F7] text-[#A39FB7]'
                                }`}
                              >
                                Pay
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DashboardCard>

              <DashboardCard>
                <SectionHeading
                  title="Contracts"
                  subtitle="Open each investment contract to review the backend ledger agreement and the full amortization table."
                />

                <div className="mt-4 flex flex-col gap-3">
                  {scheduleGroups.length === 0 ? (
                    <div className="rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 text-sm leading-6 text-[#7B879C] shadow-[0_16px_32px_rgba(31,38,64,0.05)]">
                      Contracts will appear here once an investment is registered and the payment schedule is available in Supabase.
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
                          className="rounded-[26px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 shadow-[0_16px_32px_rgba(31,38,64,0.05)]"
                        >
                          <div className="flex items-start gap-3">
                            <Avatar
                              imageUrl={group.investorAvatarUrl}
                              label={group.investorName}
                              className="h-14 w-14 shrink-0 border border-white shadow-[0_10px_20px_rgba(31,38,64,0.08)]"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[#1C2336]">
                                    {group.investorName}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-[#7B879C]">
                                    {group.investorCountry || 'Country pending'}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${activeStatus.className}`}
                                >
                                  {activeStatus.label}
                                </span>
                              </div>

                              <div className="mt-4 flex gap-6">
                                <div>
                                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                                    Next due
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-[#1C2336]">
                                    {formatDate(nextDueDate)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                                    Installments
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-[#1C2336]">
                                    {group.rows.length}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  router.push(`/contracts?credit=${encodeURIComponent(group.creditId)}`)
                                }
                                className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] px-4 text-xs font-semibold text-white shadow-[0_14px_24px_rgba(107,57,244,0.24)] transition hover:-translate-y-0.5"
                              >
                                View contract
                                <IconArrowRight />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </DashboardCard>
            </div>
          ) : null}
        </div>
      </main>

      <BottomNav />
    </>
  );
}
