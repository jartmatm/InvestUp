'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
import BottomNav from '@/components/BottomNav';
import { SectionLoadingSkeleton } from '@/components/AppLoadingSkeleton';
import { Avatar as TailgridsAvatar } from '@/components/tailgrids/core/avatar';
import { calculateInvestmentProjection } from '@/lib/investment-math';
import { getInvestmentHealth, getInvestmentHealthMeta } from '@/lib/investor-overview';
import {
  normalizePaymentScheduleRecord,
  type PaymentScheduleRecord,
} from '@/lib/payment-schedule';
import { getProjectStatusLabel, getProjectStatusTone } from '@/lib/project-status';
import { fetchCurrentUserInvestments } from '@/utils/client/current-user-investments';
import { fetchCurrentUserPaymentSchedule } from '@/utils/client/current-user-payment-schedule';
import { fetchCurrentUserProjects } from '@/utils/client/current-user-projects';
import { fetchRecipientDirectory } from '@/utils/client/recipient-directory';

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
  email: string | null;
  avatar_url: string | null;
  country: string | null;
  wallet_address: string | null;
};

type SummaryItem = {
  id: string;
  investorUserId: string | null;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  country: string | null;
  walletAddress: string;
  creditId: string | null;
  nextDueDate: Date | null;
  nextDueLabel: string;
  installmentAmount: number;
  healthTone: ReturnType<typeof getInvestmentHealthMeta>;
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

type FundingHalfDonutChartProps = {
  progressRatio: number;
  label: string;
  variant?: 'mobile' | 'desktop';
};

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
  if (profile?.email?.trim()) return profile.email.trim();
  return 'Investor';
};

const initialsFrom = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'I';

const formatDate = (value: Date | null, pendingLabel: string) => {
  if (!value || Number.isNaN(value.getTime())) return pendingLabel;
  return value.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

const clampRatio = (value: number) => Math.max(0, Math.min(1, value));

const buildDonutSegmentPath = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) => {
  if (Math.abs(startAngle - endAngle) < 0.001) return '';

  const polarToCartesian = (angle: number, radius: number) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: radius * Math.cos(radians),
      y: -radius * Math.sin(radians),
    };
  };

  const outerStart = polarToCartesian(startAngle, outerRadius);
  const outerEnd = polarToCartesian(endAngle, outerRadius);
  const innerEnd = polarToCartesian(endAngle, innerRadius);
  const innerStart = polarToCartesian(startAngle, innerRadius);
  const largeArcFlag = Math.abs(startAngle - endAngle) > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
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

function SectionHeading({ title, subtitle, actionLabel }: SectionHeadingProps) {
  const commonT = useTranslations('Common');
  const resolvedActionLabel = actionLabel ?? commonT('viewAll');

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-[1rem] font-semibold tracking-[-0.03em] text-[#1C2336]">{title}</h3>
        {subtitle ? (
          <p className="mt-1 text-xs leading-5 text-[#7B879C]">{subtitle}</p>
        ) : null}
      </div>
      <span className="shrink-0 text-xs font-semibold text-[#6B39F4]">{resolvedActionLabel}</span>
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
  return (
    <TailgridsAvatar
      src={imageUrl ?? undefined}
      alt={label}
      fallback={initialsFrom(label)}
      className={`rounded-full bg-[#EDE8FF] text-white shadow-[0_14px_28px_rgba(107,57,244,0.20)] ${className}`}
    />
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

function FundingHalfDonutChart({
  progressRatio,
  label,
  variant = 'mobile',
}: FundingHalfDonutChartProps) {
  const radius = 420;
  const innerRadius = radius / 1.625;
  const lightStrokeEffect = 10;
  const normalizedRatio = clampRatio(progressRatio);
  const [animatedRatio, setAnimatedRatio] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setAnimatedRatio(normalizedRatio));
    return () => window.cancelAnimationFrame(frame);
  }, [normalizedRatio]);

  const filledEndAngle = 180 - animatedRatio * 180;
  const trackPath = buildDonutSegmentPath(180, 0, innerRadius, radius);
  const fillPath = buildDonutSegmentPath(180, filledEndAngle, innerRadius, radius);
  const percentageLabel = `${(animatedRatio * 100).toFixed(2)}%`;
  const widthClassName = variant === 'desktop' ? 'w-full max-w-[19rem]' : 'w-full max-w-[16rem]';

  return (
    <div className="relative" data-chart="funding-half-donut">
      <svg
        viewBox={`-${radius} -${radius} ${radius * 2} ${radius}`}
        className={`mx-auto overflow-visible ${widthClassName}`}
        role="img"
        aria-label={`${label}: ${percentageLabel}`}
      >
        <path
          d={trackPath}
          className="fill-[#E0E0E0]"
          stroke="rgba(255,255,255,0.30)"
          strokeWidth={lightStrokeEffect}
        />
        {fillPath ? (
          <path
            d={fillPath}
            className="fill-[#6B39F4] transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
            stroke="rgba(255,255,255,0.30)"
            strokeWidth={lightStrokeEffect}
          />
        ) : null}
        <text
          transform={`translate(0, ${-radius / 4})`}
          textAnchor="middle"
          fontSize={48}
          fontWeight="700"
          fill="currentColor"
          className="text-[#3F4658]"
        >
          {label}
        </text>
        <text
          transform={`translate(0, ${-radius / 12})`}
          textAnchor="middle"
          fontSize={64}
          fontWeight="800"
          fill="currentColor"
          className="text-[#090F22]"
        >
          {percentageLabel}
        </text>
      </svg>
    </div>
  );
}

function FundingGauge({
  raised,
  target,
}: {
  raised: number;
  target: number;
}) {
  const progressRatio = target > 0 ? clampRatio(raised / target) : 0;

  return (
    <DashboardCard className="overflow-hidden border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(245,243,255,0.90)_55%,rgba(241,246,255,0.96)_100%)] p-5 text-[#1C2336] shadow-[0_26px_64px_rgba(31,38,64,0.10)] ring-1 ring-[#EEF1FF]/80">
      <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-[radial-gradient(circle_at_50%_12%,rgba(124,92,255,0.16),transparent_42%),radial-gradient(circle_at_50%_100%,rgba(53,201,130,0.08),transparent_32%)]" />
      <div className="pointer-events-none absolute -left-16 top-8 h-36 w-36 rounded-full bg-[#7C5CFF]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-12 bottom-3 h-28 w-28 rounded-full bg-[#35C982]/8 blur-3xl" />

      <div className="relative">
        <div className="relative pt-4">
          <FundingHalfDonutChart
            progressRatio={progressRatio}
            label="Goal progress"
            variant="mobile"
          />
        </div>
      </div>
    </DashboardCard>
  );
}

function DesktopFundingGauge({
  raised,
  target,
}: {
  raised: number;
  target: number;
}) {
  const progressRatio = target > 0 ? clampRatio(raised / target) : 0;

  return (
    <section
      className="relative flex w-full items-center justify-center overflow-visible rounded-[28px] border border-[#DDE3F0] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFBFF_52%,#F7FAFF_100%)] shadow-[0_26px_70px_rgba(21,28,44,0.08)]"
      style={{
        minHeight: 'clamp(260px, 35vh, 420px)',
        padding: 'clamp(16px, 2vw, 32px)',
        boxSizing: 'border-box',
      }}
    >
      <div className="pointer-events-none absolute left-8 top-7 h-36 w-36 opacity-40 [background-image:radial-gradient(circle,#AFA1FF_1.3px,transparent_1.3px)] [background-size:18px_18px]" />
      <div className="pointer-events-none absolute bottom-7 right-12 h-28 w-28 opacity-45 [background-image:radial-gradient(circle,#8EA3FF_1.3px,transparent_1.3px)] [background-size:18px_18px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-96 rounded-[50%] border border-[#BBA7FF]/20" />
      <div className="pointer-events-none absolute -bottom-16 -right-20 h-64 w-[460px] rounded-[50%] border border-[#82E6C2]/20" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(124,92,255,0.10),transparent_36%),radial-gradient(circle_at_82%_72%,rgba(72,211,154,0.08),transparent_32%)]" />

      <div className="relative flex w-full items-center justify-center">
        <FundingHalfDonutChart
          progressRatio={progressRatio}
          label="Goal progress"
          variant="desktop"
        />
      </div>
    </section>
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

function DesktopMetricTile({
  icon,
  label,
  value,
  accent = 'purple',
  badgeClassName = '',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: 'purple' | 'blue' | 'green' | 'amber';
  badgeClassName?: string;
}) {
  const accentClassMap = {
    purple: 'bg-[#F1ECFF] text-[#6B39F4]',
    blue: 'bg-[#EEF4FF] text-[#4C6EF5]',
    green: 'bg-[#E7FBF4] text-[#0B9B72]',
    amber: 'bg-[#FFF7E8] text-[#B76E00]',
  } as const;

  return (
    <article className="group flex min-h-[132px] items-center gap-[27px] rounded-[24px] border border-[#E1E6F0] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFDFF_100%)] p-7 shadow-[0_18px_42px_rgba(21,28,44,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_58px_rgba(21,28,44,0.09)]">
      <span className={`grid h-20 w-20 shrink-0 place-items-center rounded-[24px] [&>svg]:scale-[1.65] ${accentClassMap[accent]}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.82rem] font-medium uppercase tracking-[0.2em] text-[#7D879C]">
          {label}
        </span>
        <span
          className={`mt-3 inline-flex text-[1.65rem] font-semibold tracking-[-0.055em] text-[#090F22] ${
            badgeClassName ? `rounded-full border px-5 py-2 text-base font-semibold ${badgeClassName}` : ''
          }`}
        >
          {value}
        </span>
      </span>
    </article>
  );
}

function DesktopSummarySection({
  currency,
  projectId,
  router,
  summaryItems,
}: {
  currency: string;
  projectId: string | number;
  router: ReturnType<typeof useRouter>;
  summaryItems: SummaryItem[];
}) {
  const t = useTranslations('Portfolio');

  return (
    <section className="rounded-[24px] border border-[#E8EBF4] bg-white p-7 shadow-[0_22px_52px_rgba(21,28,44,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-[-0.045em] text-[#111827]">{t('summary')}</h2>
          <p className="mt-1 text-sm font-medium text-[#66728A]">
            {t('investorsSupporting', { count: summaryItems.length })}
          </p>
        </div>
        <span className="rounded-full bg-[#F1ECFF] px-3 py-1.5 text-xs font-bold text-[#6B39F4]">
          {t('liveFunding')}
        </span>
      </div>

      <div className="mt-6 overflow-hidden">
        <div className="grid grid-cols-[minmax(260px,1.5fr)_1fr_1fr_1fr_220px] border-b border-[#E8EBF4] px-1 pb-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#7C879D]">
          <span>{t('investor')}</span>
          <span>{t('dueDate')}</span>
          <span>{t('installment')}</span>
          <span>{t('status')}</span>
          <span className="text-right">{t('actions')}</span>
        </div>

        {summaryItems.length === 0 ? (
          <div className="rounded-2xl bg-[#F8F9FB] px-4 py-8 text-center text-sm font-medium text-[#66728A]">
            {t('noInvestors')}
          </div>
        ) : (
          <div className="divide-y divide-[#EEF1F7]">
            {summaryItems.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[minmax(260px,1.5fr)_1fr_1fr_1fr_220px] items-center px-1 py-5"
              >
                <span className="flex min-w-0 items-center gap-4">
                  <Avatar
                    imageUrl={item.avatarUrl}
                    label={item.displayName}
                    className="h-12 w-12 shrink-0 border border-white shadow-[0_10px_20px_rgba(31,38,64,0.08)]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-[#111827]">
                      {item.displayName}
                    </span>
                    <span className="mt-1 block truncate text-sm font-medium text-[#66728A]">
                      {item.country || t('countryPending')}
                    </span>
                  </span>
                </span>

                <span className="text-sm font-semibold text-[#66728A]">{item.nextDueLabel}</span>
                <span className={`text-sm font-bold ${item.healthTone.textClass}`}>
                  {money(item.installmentAmount, currency)}
                </span>
                <span>
                  <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${item.healthTone.badgeClass}`}>
                    {item.healthTone.label}
                  </span>
                </span>
                <span className="flex justify-end gap-2">
                  {item.creditId ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/contracts?credit=${encodeURIComponent(item.creditId ?? '')}`)}
                      className="inline-flex h-10 items-center rounded-xl border border-[#E4E8F1] bg-white px-3 text-xs font-bold text-[#273247] shadow-[0_10px_22px_rgba(21,28,44,0.04)] transition hover:bg-[#F8F9FB]"
                    >
                      {t('contract')}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/invest/wallet?mode=repayment${
                          item.email ? `&email=${encodeURIComponent(item.email)}` : ''
                        }&wallet=${encodeURIComponent(item.walletAddress)}&amount=${encodeURIComponent(
                          item.installmentAmount.toFixed(2)
                        )}&name=${encodeURIComponent(item.displayName)}&projectId=${encodeURIComponent(
                          String(projectId)
                        )}&investorUserId=${encodeURIComponent(item.investorUserId ?? '')}`
                      )
                    }
                    disabled={!item.walletAddress}
                    className={`inline-flex h-10 items-center rounded-xl px-4 text-xs font-bold transition ${
                      item.walletAddress
                        ? 'bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] text-white shadow-[0_14px_24px_rgba(107,57,244,0.22)] hover:-translate-y-0.5'
                        : 'bg-[#E7E4F7] text-[#A39FB7]'
                    }`}
                  >
                    {t('pay')}
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function EntrepreneurFeedDashboard({
  embedded = false,
  desktop = false,
}: {
  embedded?: boolean;
  desktop?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations('Portfolio');
  const { user, getAccessToken } = usePrivy();
  const [project, setProject] = useState<EntrepreneurProjectRow | null>(null);
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.id) {
        setProject(null);
        setSummaryItems([]);
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
        setStatus(t('loadVentureDashboardError'));
        setProject(null);
        setSummaryItems([]);
        setLoading(false);
        return;
      }

      const currentProject = ((projectData ?? [])[0] as EntrepreneurProjectRow | undefined) ?? null;
      setProject(currentProject);

      if (!currentProject) {
        setSummaryItems([]);
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
        setStatus(t('loadInvestorSummaryError'));
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
        const { data: profilesData } = await fetchRecipientDirectory(getAccessToken, {
          ids: investorIds,
          limit: investorIds.length,
        });

        ((profilesData ?? []) as InvestorProfile[]).forEach((profile) => {
          profileMap.set(profile.id, profile);
        });
      }

      const nextScheduleByInvestor = new Map<string, PaymentScheduleRecord>();
      const contractIdByInvestor = new Map<string, string>();
      const { data: scheduleData, error: scheduleError } = await fetchCurrentUserPaymentSchedule(
        getAccessToken,
        { projectId }
      );

      if (scheduleError) {
        setStatus(t('loadPaymentScheduleError'));
      }

      if (!scheduleError && scheduleData) {
        const normalizedRecords = (scheduleData as Record<string, unknown>[]).map(
          normalizePaymentScheduleRecord
        );

        normalizedRecords.forEach((record) => {
          if (
            record.investor_user_id &&
            record.credit_id &&
            !contractIdByInvestor.has(record.investor_user_id)
          ) {
            contractIdByInvestor.set(record.investor_user_id, record.credit_id);
          }

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
            email: investor?.email ?? null,
            avatarUrl: investor?.avatar_url ?? null,
            country: investor?.country ?? null,
            walletAddress: investor?.wallet_address ?? investment.from_wallet ?? '',
            creditId: investment.investor_user_id
              ? contractIdByInvestor.get(investment.investor_user_id) ?? scheduleSnapshot?.credit_id ?? null
              : null,
            nextDueDate,
            nextDueLabel: formatDate(nextDueDate, t('pending')),
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
      setLoading(false);
    };

    void loadDashboard();
  }, [getAccessToken, t, user?.id]);

  const targetAmount = Number(project?.amount_requested ?? 0);
  const raisedAmount = Number(project?.amount_received ?? 0);
  const remainingAmount = Math.max(targetAmount - raisedAmount, 0);
  const currency = project?.currency ?? 'USD';
  const statusLabel = project
    ? getProjectStatusLabel(project) === 'Financing in progress'
      ? t('financingInProgress')
      : getProjectStatusLabel(project)
    : '--';

  const infoRows = [
    {
      label: t('fundingGoal'),
      value: money(targetAmount, currency),
      icon: <IconTarget />,
      accent: 'purple' as const,
    },
    {
      label: t('fundsRaised'),
      value: money(raisedAmount, currency),
      icon: <IconWallet />,
      accent: 'green' as const,
    },
    {
      label: t('interestRate'),
      value: project?.interest_rate ? `${project.interest_rate}% EA` : '--',
      icon: <IconPercent />,
      accent: 'amber' as const,
    },
    {
      label: t('amountRemaining'),
      value: money(remainingAmount, currency),
      icon: <IconClock />,
      accent: 'purple' as const,
    },
    {
      label: t('status'),
      value: statusLabel,
      icon: <IconChart />,
      accent: 'green' as const,
      badgeClassName: project ? getProjectStatusTone(project) : '',
    },
  ];

  if (desktop) {
    return (
      <div className="space-y-5">
        {loading ? (
          <div className="space-y-4">
            <div className="h-[370px] animate-pulse rounded-[28px] bg-white shadow-[0_22px_52px_rgba(21,28,44,0.06)]" />
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="h-32 animate-pulse rounded-[22px] bg-white" />
              ))}
            </div>
            <div className="h-72 animate-pulse rounded-[24px] bg-white" />
          </div>
        ) : null}

        {status ? (
          <section className="rounded-[22px] border border-[#E8EBF4] bg-white px-5 py-4 text-sm font-medium text-[#66728A] shadow-[0_18px_42px_rgba(21,28,44,0.05)]">
            {status}
          </section>
        ) : null}

        {!loading && !project ? (
          <section className="rounded-[24px] border border-dashed border-[#C9B8FF] bg-white p-10 text-center shadow-[0_22px_52px_rgba(21,28,44,0.05)]">
            <p className="text-xl font-bold tracking-[-0.045em] text-[#111827]">
              {t('publishVentureFirst')}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-[#66728A]">
              {t('publishVentureFirstDescription')}
            </p>
          </section>
        ) : null}

        {!loading && project ? (
          <>
            <DesktopFundingGauge
              raised={raisedAmount}
              target={targetAmount}
            />

            <section className="grid grid-cols-3 gap-4">
              {infoRows.map((row) => (
                <DesktopMetricTile
                  key={row.label}
                  icon={row.icon}
                  label={row.label}
                  value={row.value}
                  accent={row.accent}
                  badgeClassName={row.badgeClassName}
                />
              ))}
            </section>

            <DesktopSummarySection
              currency={currency}
              projectId={project.id}
              router={router}
              summaryItems={summaryItems}
            />
          </>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <main
        className={
          embedded
            ? 'relative text-[#101828]'
            : 'relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.16),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F5F6FC_52%,#F7F8FD_100%)] pb-36 text-[#101828]'
        }
      >
        {!embedded ? (
          <>
            <div className="pointer-events-none absolute left-1/2 top-[-9rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-28 top-56 h-64 w-64 rounded-full bg-[#B9A8FF]/16 blur-3xl" />
            <div className="pointer-events-none absolute -left-24 top-[32rem] h-64 w-64 rounded-full bg-[#7DE0B8]/8 blur-3xl" />
          </>
        ) : null}

        <div
          className={
            embedded
              ? 'relative flex w-full flex-col gap-4 pb-2'
              : 'relative mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-8 pt-10'
          }
        >
          {!embedded ? (
            <header className="flex items-start gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-0.5 text-[1.9rem] font-semibold tracking-[-0.07em] text-[#1C2336]">
                  <span>Invest</span>
                  <span className="text-[#6B39F4]">App</span>
                  <span className="ml-0.5 mt-0.5 h-3 w-3 rounded-full bg-[#6B39F4]" />
                </div>
                <h1 className="mt-4 text-[2rem] font-semibold tracking-[-0.065em] text-[#1C2336]">
                  {t('dashboard')}
                </h1>
                <p className="mt-1 text-sm leading-6 text-[#7B879C]">
                  {t('dashboardSubtitle')}
                </p>
              </div>
            </header>
          ) : null}

          {loading ? (
            <SectionLoadingSkeleton rows={4} />
          ) : null}

          {status ? (
            <DashboardCard className="text-sm text-[#7B879C]">{status}</DashboardCard>
          ) : null}

          {!loading && !project ? (
            <DashboardCard className="text-sm text-[#667085]">
              {t('publishFirstMobile')}
            </DashboardCard>
          ) : null}

          {!loading && project ? (
            <div className="flex flex-col gap-4 pb-2">
              <FundingGauge
                raised={raisedAmount}
                target={targetAmount}
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
                  title={t('summary')}
                  subtitle={t('investorsSupporting', { count: summaryItems.length })}
                />

                <div className="mt-4 flex flex-col gap-3">
                  {summaryItems.length === 0 ? (
                    <div className="rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 text-sm leading-6 text-[#7B879C] shadow-[0_16px_32px_rgba(31,38,64,0.05)]">
                      {t('noInvestors')}
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
                                  {item.country || t('countryPending')}
                                </p>
                              </div>
                              <span
                                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${item.healthTone.badgeClass}`}
                              >
                                {item.healthTone.label}
                              </span>
                            </div>

                            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                              <div className="flex gap-6">
                                <div>
                                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                                    {t('dueDate')}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-[#1C2336]">
                                    {item.nextDueLabel}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                                    {t('installment')}
                                  </p>
                                  <p className={`mt-1 text-xs font-semibold ${item.healthTone.textClass}`}>
                                    {money(item.installmentAmount, currency)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap justify-end gap-2">
                                {item.creditId ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      router.push(
                                        `/contracts?credit=${encodeURIComponent(item.creditId ?? '')}`
                                      )
                                    }
                                    className="inline-flex min-h-[40px] shrink-0 items-center rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] px-4 text-xs font-semibold text-white shadow-[0_14px_24px_rgba(107,57,244,0.24)] transition hover:-translate-y-0.5"
                                  >
                                    {t('viewContract')}
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(
                                      `/invest/wallet?mode=repayment${
                                        item.email ? `&email=${encodeURIComponent(item.email)}` : ''
                                      }&wallet=${encodeURIComponent(
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
                                  {t('pay')}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DashboardCard>
            </div>
          ) : null}
        </div>
      </main>

      {!embedded ? <BottomNav /> : null}
    </>
  );
}
