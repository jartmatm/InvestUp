'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import BottomNav from '@/components/BottomNav';
import { DesktopSidebarIcon } from '@/components/DesktopSidebarIcon';
import {
  formatNextRepaymentDate,
  getInvestmentHealth,
  getNextRepaymentDate,
  type InvestmentHealth,
} from '@/lib/investor-overview';
import { calculateInvestmentProjection } from '@/lib/investment-math';
import { useInvestApp } from '@/lib/investapp-context';
import { useUserProfileSummary } from '@/lib/use-user-profile-summary';
import { fetchCurrentUserInvestments } from '@/utils/client/current-user-investments';
import { fetchProjects } from '@/utils/client/projects';
import { fetchRecipientDirectory } from '@/utils/client/recipient-directory';

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
  email: string | null;
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

type DesktopActivityRow = {
  id: string;
  href: string;
  businessName: string;
  category: string;
  type: string;
  statusLabel: string;
  statusBadgeClassName: string;
  dotClassName: string;
  dateLabel: string;
  coverImage: string | null;
};

const FALLBACK_SPARKLINE = [18, 24, 22, 20, 28, 36, 34, 40, 37, 48, 56, 64];
const DESKTOP_FALLBACK_SPARKLINE = [22, 36, 31, 34, 27, 39, 40, 52, 58, 68, 60, 54, 62, 65, 72, 82];
const DEFAULT_PORTFOLIO_VALUE = 100;
const DEFAULT_AVERAGE_RATE = 25;
const DEFAULT_ACCUMULATED_EARNINGS = 95.31;
const DEFAULT_MONTHLY_GROWTH = 5.2;

const MOCK_ACTIVITY_ROWS: DesktopActivityRow[] = [
  {
    id: 'mock-empanadas-play',
    href: '/feed',
    businessName: 'Empanadas Play',
    category: 'Food & Beverage',
    type: 'Investment',
    statusLabel: 'Up to date',
    statusBadgeClassName: 'bg-[#E9FBF5] text-[#0B9B72]',
    dotClassName: 'bg-[#27D6A4]',
    dateLabel: 'Today, 9:30 AM',
    coverImage:
      'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=240&q=80',
  },
  {
    id: 'mock-tienda-urbana',
    href: '/feed',
    businessName: 'Tienda Urbana',
    category: 'Retail',
    type: 'Investment',
    statusLabel: 'Up to date',
    statusBadgeClassName: 'bg-[#E9FBF5] text-[#0B9B72]',
    dotClassName: 'bg-[#27D6A4]',
    dateLabel: 'Yesterday, 6:15 PM',
    coverImage:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=240&q=80',
  },
  {
    id: 'mock-platforma-educativa',
    href: '/feed',
    businessName: 'Plataforma educativa',
    category: 'Education',
    type: 'Investment',
    statusLabel: 'Up to date',
    statusBadgeClassName: 'bg-[#E9FBF5] text-[#0B9B72]',
    dotClassName: 'bg-[#27D6A4]',
    dateLabel: 'May 5, 11:20 AM',
    coverImage:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=240&q=80',
  },
];

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const percent = (value: number) => `${value.toFixed(1)}%`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizePhotos = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

const ownerNameFrom = (owner: OwnerRow | undefined) => {
  const full = `${owner?.name ?? ''} ${owner?.surname ?? ''}`.trim();
  if (full) return full;
  if (owner?.email?.trim()) return owner.email.trim();
  return 'Business owner';
};

const getHealthMeta = (health: InvestmentHealth) => {
  if (health === 'up_to_date') {
    return {
      label: 'Up to date',
      badgeClassName: 'bg-[#E9FBF5] text-[#0B9B72]',
      dotClassName: 'bg-[#27D6A4]',
    };
  }

  if (health === 'due_soon') {
    return {
      label: 'Due soon',
      badgeClassName: 'bg-[#FFF5E8] text-[#D97706]',
      dotClassName: 'bg-[#FFB84D]',
    };
  }

  return {
    label: 'Overdue',
    badgeClassName: 'bg-[#FFF0F3] text-[#E11D48]',
    dotClassName: 'bg-[#FB7185]',
  };
};

const formatActivityTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const timeLabel = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (date.toDateString() === now.toDateString()) {
    return `Today, ${timeLabel}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${timeLabel}`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const buildSparklineSeries = (items: PortfolioItem[]) => {
  if (items.length === 0) return FALLBACK_SPARKLINE;

  const ascending = [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const cumulative = ascending.reduce<number[]>((series, item) => {
    const nextValue = (series.at(-1) ?? 0) + item.amountInvested;
    series.push(nextValue);
    return series;
  }, []);

  let workingSeries = [...cumulative];

  if (workingSeries.length === 1) {
    const target = workingSeries[0];
    workingSeries = [
      target * 0.34,
      target * 0.46,
      target * 0.42,
      target * 0.58,
      target * 0.66,
      target * 0.62,
      target * 0.75,
      target,
    ];
  }

  while (workingSeries.length < 12) {
    const last = workingSeries.at(-1) ?? 1;
    const prev = workingSeries.at(-2) ?? last * 0.82;
    const step = Math.max(Math.abs(last - prev) * 0.65, last * 0.04, 2);
    workingSeries.push(last + step);
  }

  const visible = workingSeries.slice(-12);
  const min = Math.min(...visible);
  const max = Math.max(...visible);
  const wiggle = [0, 4, -2, 3, -3, 2, -1, 5, -2, 2, -1, 0];

  if (max === min) {
    return visible.map((_, index) => 42 + wiggle[index]);
  }

  return visible.map((value, index) =>
    clamp(18 + ((value - min) / (max - min)) * 54 + wiggle[index], 12, 86)
  );
};

const buildSmoothPath = (points: number[]) => {
  if (points.length === 0) return '';

  const width = 320;
  const baseline = 108;
  const stepX = points.length === 1 ? 0 : width / (points.length - 1);
  const coordinates = points.map((point, index) => ({
    x: index * stepX,
    y: baseline - point,
  }));

  let path = `M ${coordinates[0].x} ${coordinates[0].y}`;
  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];
    const controlX = (previous.x + current.x) / 2;
    path += ` C ${controlX} ${previous.y}, ${controlX} ${current.y}, ${current.x} ${current.y}`;
  }

  return path;
};

const buildDesktopTrendPath = (points: number[]) => {
  if (points.length === 0) return '';

  const width = 640;
  const baseline = 112;
  const stepX = points.length === 1 ? 0 : width / (points.length - 1);
  const coordinates = points.map((point, index) => ({
    x: index * stepX,
    y: baseline - point,
  }));

  let path = `M ${coordinates[0].x} ${coordinates[0].y}`;
  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];
    const controlX = (previous.x + current.x) / 2;
    path += ` C ${controlX} ${previous.y}, ${controlX} ${current.y}, ${current.x} ${current.y}`;
  }

  return path;
};

const initialsFrom = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-slate-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function PortfolioValueIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4.5" y="6.5" width="15" height="12" rx="3" />
      <path d="M8 10.5H16" />
    </svg>
  );
}

function AverageRateIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 17V13" strokeLinecap="round" />
      <path d="M12 17V8" strokeLinecap="round" />
      <path d="M18 17V5" strokeLinecap="round" />
      <path d="M4 19H20" strokeLinecap="round" />
    </svg>
  );
}

function EarningsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M14.8 9.5c0-.9-1-1.7-2.3-1.7s-2.3.8-2.3 1.7c0 2.5 4.6 1.2 4.6 4 0 1.1-1 1.9-2.3 1.9s-2.3-.8-2.3-1.9" strokeLinecap="round" />
      <path d="M12.5 6.9v10.2" strokeLinecap="round" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 15l4-4 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h4v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ActivityGlyphIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 5v14" strokeLinecap="round" />
      <path d="M5 12h14" strokeLinecap="round" />
      <circle cx="12" cy="12" r="7" opacity="0.2" />
    </svg>
  );
}

function PortfolioGauge({ value }: { value: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = clamp(value / 30, 0, 1);
  const dash = circumference * progress;

  return (
    <div className="relative flex h-[132px] w-[132px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="portfolio-rate-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67F5C5" />
            <stop offset="100%" stopColor="#2FD1A2" />
          </linearGradient>
        </defs>
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#portfolio-rate-ring)"
          strokeWidth="10"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[29px] font-semibold tracking-[-0.04em] text-white">{percent(value)}</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
          Agv. Rate
        </p>
      </div>
    </div>
  );
}

function PortfolioSparkline({ points }: { points: number[] }) {
  const linePath = buildSmoothPath(points);
  const lastPoint = points.at(-1) ?? 0;
  const lastX = points.length > 1 ? 320 : 0;
  const lastY = 108 - lastPoint;
  const areaPath = `${linePath} L 320 112 L 0 112 Z`;

  return (
    <svg viewBox="0 0 320 120" className="h-[82px] w-full">
      <defs>
        <linearGradient id="portfolio-chart-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id="portfolio-chart-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blurred" />
          <feMerge>
            <feMergeNode in="blurred" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={areaPath} fill="url(#portfolio-chart-fill)" opacity="0.9" />
      <path
        d={linePath}
        fill="none"
        stroke="rgba(255,255,255,0.88)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={lastX}
        cy={lastY}
        r="4.5"
        fill="#FFFFFF"
        stroke="#BFA8FF"
        strokeWidth="2"
        filter="url(#portfolio-chart-glow)"
      />
    </svg>
  );
}

function StatRow({
  icon,
  iconClassName,
  label,
  value,
}: {
  icon: ReactNode;
  iconClassName: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 px-2 py-3">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full ${iconClassName}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[0.96rem] font-medium tracking-[-0.02em] text-slate-500">{label}</p>
      </div>
      <p className="text-[1.12rem] font-semibold tracking-[-0.03em] text-slate-800">{value}</p>
      <ChevronRightIcon />
    </div>
  );
}

function PerformanceMiniChart() {
  return (
    <svg viewBox="0 0 120 70" className="h-14 w-[96px] shrink-0">
      <path
        d="M8 58H112"
        stroke="rgba(17,24,39,0.08)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="18" y="42" width="10" height="16" rx="3" fill="#C5F6E8" />
      <rect x="40" y="34" width="10" height="24" rx="3" fill="#97EFD7" />
      <rect x="62" y="25" width="10" height="33" rx="3" fill="#6BE6C3" />
      <rect x="84" y="16" width="10" height="42" rx="3" fill="#4FD8B4" />
      <path
        d="M18 36C26 32 36 28 45 29C54 30 64 18 73 20C82 22 91 15 100 16"
        fill="none"
        stroke="#7C5CFF"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="100" cy="16" r="4.5" fill="#7C5CFF" />
      <circle cx="73" cy="20" r="3" fill="#FFFFFF" stroke="#7C5CFF" strokeWidth="2" />
      <circle cx="45" cy="29" r="3" fill="#FFFFFF" stroke="#7C5CFF" strokeWidth="2" />
    </svg>
  );
}

function DesktopSearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16.7 16.7A7.5 7.5 0 1 0 5.3 5.3a7.5 7.5 0 0 0 11.4 11.4Z" />
      <path d="M16.7 16.7 21 21" />
    </svg>
  );
}

function DesktopBellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4a5 5 0 0 0-5 5v3c0 .9-.3 1.8-.9 2.5L5 16h14l-1.1-1.5A4 4 0 0 1 17 12V9a5 5 0 0 0-5-5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

function DesktopInvestAppLogo() {
  return (
    <div className="flex items-center gap-0.5 text-[1.55rem] font-semibold tracking-[-0.07em] text-[#111827]">
      <span>Invest</span>
      <span className="text-[#6B39F4]">App</span>
      <span className="ml-0.5 mt-0.5 h-2.5 w-2.5 rounded-full bg-[#6B39F4]" />
    </div>
  );
}

function Sidebar() {
  const primaryItems = [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/portfolio', label: 'Portfolio', icon: 'portfolio', active: true },
    { href: '/invest', label: 'Send', icon: 'send' },
    { href: '/feed', label: 'Feed', icon: 'feed' },
    { href: '/profile', label: 'Profile', icon: 'profile' },
  ];
  const utilityItems = [
    { href: '/home?topup=1', label: 'Top up', icon: 'topup' },
    { href: '/withdraw', label: 'Withdraw', icon: 'withdraw' },
    { href: '/contracts', label: 'Documents', icon: 'documents' },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-[#E7EAF3] bg-white/94 px-5 py-6 shadow-[12px_0_50px_rgba(21,28,44,0.04)] backdrop-blur-xl">
      <DesktopInvestAppLogo />

      <nav className="mt-9 space-y-1.5">
        {primaryItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition ${
              item.active
                ? 'bg-[#F1ECFF] text-[#6B39F4]'
                : 'text-[#64708A] hover:bg-[#F7F8FB] hover:text-[#1F2A44]'
            }`}
          >
            <DesktopSidebarIcon type={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-7 border-t border-[#EEF1F7] pt-6">
        <p className="px-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#98A1B5]">
          Inversionista
        </p>
        <div className="mt-3 space-y-1.5">
          {utilityItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex h-10 items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-[#64708A] transition duration-200 hover:bg-[#F7F8FB] hover:text-[#1F2A44]"
            >
              <DesktopSidebarIcon type={item.icon} />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-auto rounded-[24px] border border-[#ECE7FF] bg-[linear-gradient(145deg,#FFFFFF_0%,#F4F0FF_100%)] p-5 text-center shadow-[0_24px_60px_rgba(107,57,244,0.10)]">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EEE7FF] text-[#6B39F4]">
          <EarningsIcon />
        </span>
        <p className="mt-4 text-base font-bold text-[#6B39F4]">Hazte Premium</p>
        <p className="mt-2 text-sm leading-5 text-[#74809A]">
          Tu proyecto en los primeros lugares y mas visibilidad.
        </p>
        <Link
          href="/profile"
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#7C5CFF_0%,#5B2FF4_100%)] text-sm font-bold text-white shadow-[0_16px_30px_rgba(107,57,244,0.24)] transition duration-200 hover:-translate-y-0.5"
        >
          Ver planes
        </Link>
      </div>
    </aside>
  );
}

function Topbar({
  avatarUrl,
  displayName,
  profileRole,
}: {
  avatarUrl: string;
  displayName: string;
  profileRole: string;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[80px] items-center gap-8 border-b border-[#E7EAF3] bg-white/86 px-8 backdrop-blur-xl">
      <label className="relative block w-full max-w-[760px]">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA4B7]">
          <DesktopSearchIcon />
        </span>
        <input
          placeholder="Buscar emprendimientos, emprendedores o palabras clave..."
          className="h-12 w-full rounded-2xl border border-[#DDE2EE] bg-white pl-12 pr-4 text-sm font-medium text-[#182033] outline-none shadow-[0_12px_28px_rgba(21,28,44,0.04)] transition placeholder:text-[#9BA5B8] focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10"
        />
      </label>

      <div className="ml-auto flex min-w-[380px] items-center justify-end gap-5">
        <button
          type="button"
          className="relative grid h-11 w-11 place-items-center rounded-2xl border border-[#E7EAF3] bg-white text-[#1F2A44] shadow-[0_12px_28px_rgba(21,28,44,0.05)] transition duration-200 hover:-translate-y-0.5"
          aria-label="Notifications"
        >
          <DesktopBellIcon />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#6B39F4]" />
        </button>

        <div className="h-9 w-px bg-[#E7EAF3]" />

        <div className="flex min-w-[190px] items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-full bg-[#EEF2FF] bg-cover bg-center text-sm font-bold text-[#6B39F4] ring-2 ring-white shadow-[0_12px_28px_rgba(21,28,44,0.10)]"
            style={{ backgroundImage: avatarUrl ? `url(${JSON.stringify(avatarUrl)})` : undefined }}
          >
            {avatarUrl ? null : initialsFrom(displayName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-[#111827]">{displayName}</span>
            <span className="block text-xs font-medium text-[#73809A]">{profileRole}</span>
          </span>
          <ChevronRightIcon />
        </div>
      </div>
    </header>
  );
}

function DashboardLayout({
  avatarUrl,
  children,
  displayName,
  profileRole,
}: {
  avatarUrl: string;
  children: ReactNode;
  displayName: string;
  profileRole: string;
}) {
  return (
    <div className="investapp-desktop-autofit hidden min-h-screen bg-[#F8F9FB] text-[#101828] lg:block">
      <Sidebar />
      <div className="min-w-0 pl-[260px]">
        <Topbar avatarUrl={avatarUrl} displayName={displayName} profileRole={profileRole} />
        <main className="px-8 py-7 xl:px-10">
          <div className="mx-auto max-w-[1500px] space-y-5">{children}</div>
        </main>
      </div>
    </div>
  );
}

function DesktopPortfolioDonut({ value }: { value: number }) {
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const progress = clamp(value / 30, 0, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="relative flex h-[210px] w-[210px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 170 170" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="desktop-portfolio-rate-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#68F5C7" />
            <stop offset="100%" stopColor="#2FD1A2" />
          </linearGradient>
        </defs>
        <circle
          cx="85"
          cy="85"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="16"
        />
        <circle
          cx="85"
          cy="85"
          r={radius}
          fill="none"
          stroke="url(#desktop-portfolio-rate-ring)"
          strokeWidth="16"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        >
          <animate
            attributeName="stroke-dashoffset"
            from={circumference}
            to={dashOffset}
            dur="900ms"
            fill="freeze"
          />
        </circle>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[2.2rem] font-bold tracking-[-0.055em] text-white">{percent(value)}</p>
        <p className="mt-1 text-[0.78rem] font-bold uppercase tracking-[0.16em] text-white/70">
          Average rate
        </p>
      </div>
    </div>
  );
}

function DesktopPerformanceTrend({ points }: { points: number[] }) {
  const linePath = buildDesktopTrendPath(points);
  const lastPoint = points.at(-1) ?? 0;
  const lastX = points.length > 1 ? 640 : 0;
  const lastY = 112 - lastPoint;
  const areaPath = `${linePath} L 640 118 L 0 118 Z`;

  return (
    <svg viewBox="0 0 640 142" className="h-[132px] w-full overflow-visible">
      <defs>
        <linearGradient id="desktop-portfolio-chart-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.26)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id="desktop-portfolio-chart-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blurred" />
          <feMerge>
            <feMergeNode in="blurred" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d="M0 118H640" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <path d={areaPath} fill="url(#desktop-portfolio-chart-fill)" opacity="0.94" />
      <path
        d={linePath}
        fill="none"
        stroke="rgba(255,255,255,0.92)"
        strokeDasharray="760"
        strokeDashoffset="0"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      >
        <animate attributeName="stroke-dashoffset" from="760" to="0" dur="950ms" fill="freeze" />
      </path>
      <line
        x1={lastX}
        x2={lastX}
        y1={lastY}
        y2="118"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="2"
      />
      <circle
        cx={lastX}
        cy={lastY}
        r="7"
        fill="#FFFFFF"
        stroke="#BFA8FF"
        strokeWidth="4"
        filter="url(#desktop-portfolio-chart-glow)"
      />
      {[
        ['May 1', 12],
        ['May 8', 150],
        ['May 15', 294],
        ['May 22', 438],
        ['May 29', 580],
      ].map(([label, x]) => (
        <text key={label} x={Number(x)} y="138" fill="rgba(255,255,255,0.72)" fontSize="13">
          {label}
        </text>
      ))}
    </svg>
  );
}

function PortfolioHero({
  averageRate,
  monthlyGrowth,
  points,
  totalPortfolio,
}: {
  averageRate: number;
  monthlyGrowth: number;
  points: number[];
  totalPortfolio: number;
}) {
  const growthIsPositive = monthlyGrowth >= 0;

  return (
    <section className="overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_70%_15%,rgba(255,255,255,0.22),transparent_26%),linear-gradient(135deg,#765AFF_0%,#6246F5_48%,#5135DB_100%)] p-8 shadow-[0_26px_60px_rgba(91,72,255,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_32px_78px_rgba(91,72,255,0.32)]">
      <div className="grid min-h-[290px] grid-cols-[minmax(0,1.6fr)_260px] items-center gap-9">
        <div className="min-w-0">
          <p className="text-[0.8rem] font-bold uppercase tracking-[0.18em] text-white/78">
            Portfolio Value
          </p>
          <p className="mt-4 text-[3.75rem] font-bold leading-none tracking-[-0.065em] text-white">
            {money(totalPortfolio)}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-bold ${
                growthIsPositive ? 'bg-[#3AD9A8]/20 text-[#7DFFE0]' : 'bg-[#FF8CA9]/18 text-[#FFD6E0]'
              }`}
            >
              {growthIsPositive ? '↑' : '↓'} {Math.abs(monthlyGrowth).toFixed(2)}%
            </span>
            <span className="text-sm font-medium text-white/72">vs last month</span>
          </div>
          <div className="mt-6">
            <DesktopPerformanceTrend points={points} />
          </div>
        </div>

        <div className="flex justify-center">
          <DesktopPortfolioDonut value={averageRate} />
        </div>
      </div>
    </section>
  );
}

function DesktopStatCard({
  icon,
  iconClassName,
  label,
  value,
}: {
  icon: ReactNode;
  iconClassName: string;
  label: string;
  value: string;
}) {
  return (
    <article className="group flex min-h-[128px] items-center gap-5 rounded-[22px] border border-[#E9ECF4] bg-white p-6 shadow-[0_18px_42px_rgba(21,28,44,0.055)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_58px_rgba(21,28,44,0.08)]">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${iconClassName}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#66728A]">{label}</p>
        <p className="mt-2 text-[1.65rem] font-bold leading-tight tracking-[-0.05em] text-[#111827]">
          {value}
        </p>
      </div>
      <span className="text-[#A9B2C3] transition duration-200 group-hover:translate-x-0.5 group-hover:text-[#6B39F4]">
        <ChevronRightIcon />
      </span>
    </article>
  );
}

function StatsCards({
  accumulatedEarnings,
  averageRate,
  totalPortfolio,
}: {
  accumulatedEarnings: number;
  averageRate: number;
  totalPortfolio: number;
}) {
  return (
    <section className="grid grid-cols-3 gap-4">
      <DesktopStatCard
        icon={<PortfolioValueIcon />}
        iconClassName="bg-[#F1ECFF] text-[#6B39F4]"
        label="Total Portfolio"
        value={money(totalPortfolio)}
      />
      <DesktopStatCard
        icon={<AverageRateIcon />}
        iconClassName="bg-[#E7FBF4] text-[#20B486]"
        label="Average Rate"
        value={percent(averageRate)}
      />
      <DesktopStatCard
        icon={<EarningsIcon />}
        iconClassName="bg-[#F1ECFF] text-[#6B39F4]"
        label="Accumulated Earnings"
        value={money(accumulatedEarnings)}
      />
    </section>
  );
}

function InsightCard() {
  return (
    <section className="rounded-[22px] border border-[#DDF5EE] bg-[linear-gradient(135deg,#F5FFFB_0%,#F1FFFB_45%,#EEF8FF_100%)] p-6 shadow-[0_18px_42px_rgba(21,28,44,0.045)]">
      <div className="flex items-center gap-6">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-[#20B486] shadow-[0_14px_30px_rgba(21,28,44,0.06)]">
          <TrendUpIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold tracking-[-0.045em] text-[#0E8B65]">Great job!</p>
          <p className="mt-1 text-base font-medium text-[#344054]">
            You&apos;re performing better than 78% of InvestApp users.
          </p>
        </div>
        <div className="hidden min-w-[280px] justify-end md:flex">
          <PerformanceMiniChart />
        </div>
      </div>
    </section>
  );
}

function DesktopActivityThumb({ coverImage, label }: { coverImage: string | null; label: string }) {
  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[#F1ECFF] bg-cover bg-center text-[#6B39F4] ring-1 ring-[#E9ECF4]">
      {coverImage ? (
        <span
          className="block h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${JSON.stringify(coverImage)})` }}
        />
      ) : (
        <span className="text-sm font-bold">{initialsFrom(label)}</span>
      )}
    </span>
  );
}

function ActivityList({ rows, status }: { rows: DesktopActivityRow[]; status: string }) {
  return (
    <section className="rounded-[24px] border border-[#E9ECF4] bg-white p-6 shadow-[0_18px_42px_rgba(21,28,44,0.055)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-[-0.045em] text-[#111827]">Recent Activity</h2>
        </div>
        <Link
          href="/history"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#6B39F4] transition duration-200 hover:text-[#4F2ED4]"
        >
          View all
          <ChevronRightIcon />
        </Link>
      </div>

      {status ? (
        <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {status}
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden">
        <div className="grid grid-cols-[minmax(260px,1.6fr)_1fr_1fr_1fr_40px] border-b border-[#E9ECF4] px-3 pb-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#8A95A8]">
          <span>Project</span>
          <span>Type</span>
          <span>Status</span>
          <span>Date</span>
          <span />
        </div>

        <div className="divide-y divide-[#EEF1F7]">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={row.href}
              className="grid grid-cols-[minmax(260px,1.6fr)_1fr_1fr_1fr_40px] items-center px-3 py-4 transition duration-200 hover:bg-[#F8F9FB]"
            >
              <span className="flex min-w-0 items-center gap-4">
                <DesktopActivityThumb coverImage={row.coverImage} label={row.businessName} />
                <span className="min-w-0">
                  <span className="block truncate text-base font-bold tracking-[-0.035em] text-[#111827]">
                    {row.businessName}
                  </span>
                  <span className="mt-1 block truncate text-sm font-medium text-[#66728A]">
                    {row.category}
                  </span>
                </span>
              </span>

              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#66728A]">
                <span className="h-2 w-2 rounded-full bg-[#6B39F4]" />
                {row.type}
              </span>

              <span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${row.statusBadgeClassName}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${row.dotClassName}`} />
                  {row.statusLabel}
                </span>
              </span>

              <span className="text-sm font-medium text-[#66728A]">{row.dateLabel}</span>
              <span className="text-right text-[#8D98AA]">•••</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function DesktopPortfolioLoading() {
  return (
    <div className="space-y-4">
      <div className="h-[354px] animate-pulse rounded-[24px] bg-[linear-gradient(135deg,#765AFF,#5135DB)] opacity-75" />
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-[22px] bg-white shadow-[0_18px_42px_rgba(21,28,44,0.05)]" />
        ))}
      </div>
      <div className="h-28 animate-pulse rounded-[22px] bg-white" />
      <div className="h-64 animate-pulse rounded-[24px] bg-white" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-[228px] rounded-[30px] bg-[linear-gradient(135deg,#7F6BFF,#5B48FF)] opacity-70" />
      <div className="rounded-[30px] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        {[0, 1, 2].map((key) => (
          <div key={key} className="flex items-center gap-4 px-2 py-3">
            <div className="h-11 w-11 rounded-full bg-slate-100" />
            <div className="flex-1">
              <div className="h-3.5 w-28 rounded-full bg-slate-100" />
            </div>
            <div className="h-4 w-16 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="h-[92px] rounded-[28px] bg-white/80" />
      <div className="space-y-3">
        {[0, 1].map((key) => (
          <div key={key} className="h-[92px] rounded-[26px] bg-white/90" />
        ))}
      </div>
    </div>
  );
}

export default function InvestorPortfolioDashboard() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp } = useInvestApp();
  const { avatarUrl, displayName } = useUserProfileSummary();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

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

      const { data, error } = await fetchCurrentUserInvestments(getAccessToken, {
        scope: 'investor',
        statuses: 'submitted,confirmed',
      });

      if (error) {
        setStatus('Could not load your investments right now. Please try again in a moment.');
        setItems([]);
        setLoading(false);
        return;
      }

      const investments = (data ?? []) as InvestmentRow[];
      const projectIds = Array.from(
        new Set(investments.map((item) => item.project_id).filter(Boolean))
      );

      const projectMap = new Map<string, ProjectRow>();
      if (projectIds.length > 0) {
        const { data: projectsData } = await fetchProjects({
          ids: projectIds.join(','),
          limit: projectIds.length,
        });

        ((projectsData ?? []) as ProjectRow[]).forEach((project) => {
          projectMap.set(String(project.id), {
            ...project,
            id: String(project.id),
            photo_urls: normalizePhotos(project.photo_urls),
          });
        });
      }

      const ownerIds = Array.from(
        new Set([...projectMap.values()].map((project) => project.owner_user_id).filter(Boolean))
      ) as string[];

      const ownerMap = new Map<string, OwnerRow>();
      if (ownerIds.length > 0) {
        const { data: ownersData } = await fetchRecipientDirectory(getAccessToken, {
          ids: ownerIds,
          limit: ownerIds.length,
        });
        ((ownersData ?? []) as OwnerRow[]).forEach((owner) => ownerMap.set(owner.id, owner));
      }

      setItems(
        investments.map((investment) => {
          const project = projectMap.get(investment.project_id);
          const repaymentInstallments =
            investment.term_months ?? project?.installment_count ?? project?.term_months ?? 0;
          const nextRepaymentDate = getNextRepaymentDate(
            investment.created_at,
            repaymentInstallments
          );
          const projection =
            investment.projected_return_usdc != null
              ? { projectedReturnUsdc: Number(investment.projected_return_usdc) }
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
  }, [getAccessToken, user?.id]);

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [items]
  );

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
  const [portfolioSnapshotTime] = useState(() => Date.now());

  const monthlyGrowth = useMemo(() => {
    const last30 = items
      .filter(
        (item) =>
          portfolioSnapshotTime - new Date(item.createdAt).getTime() <= 1000 * 60 * 60 * 24 * 30
      )
      .reduce((sum, item) => sum + item.amountInvested, 0);
    const previous30 = items
      .filter((item) => {
        const diff = portfolioSnapshotTime - new Date(item.createdAt).getTime();
        return diff > 1000 * 60 * 60 * 24 * 30 && diff <= 1000 * 60 * 60 * 24 * 60;
      })
      .reduce((sum, item) => sum + item.amountInvested, 0);

    if (previous30 <= 0) return 0;
    return clamp(((last30 - previous30) / previous30) * 100, -99.9, 199.9);
  }, [items, portfolioSnapshotTime]);

  const sparklinePoints = useMemo(() => buildSparklineSeries(sortedItems), [sortedItems]);

  const portfolioHealthShare = useMemo(() => {
    if (items.length === 0) return 0;
    const upToDateCount = items.filter((item) => item.health === 'up_to_date').length;
    return Math.round((upToDateCount / items.length) * 100);
  }, [items]);

  const recentItems = useMemo(() => sortedItems.slice(0, 3), [sortedItems]);

  const desktopActivityRows = useMemo<DesktopActivityRow[]>(() => {
    const rows = sortedItems.slice(0, 5).map((item) => {
      const healthMeta = getHealthMeta(item.health);

      return {
        id: item.id,
        href: `/feed/${item.projectId}`,
        businessName: item.businessName,
        category: item.ownerName || 'Investment',
        type: 'Investment',
        statusLabel: healthMeta.label,
        statusBadgeClassName: healthMeta.badgeClassName,
        dotClassName: healthMeta.dotClassName,
        dateLabel: formatActivityTimestamp(item.createdAt),
        coverImage: item.coverImage,
      };
    });

    return rows.length > 0 ? rows : MOCK_ACTIVITY_ROWS;
  }, [sortedItems]);

  const profileName = displayName || 'Maria Gonzalez';
  const desktopTotalPortfolio = totalPortfolio > 0 ? totalPortfolio : DEFAULT_PORTFOLIO_VALUE;
  const desktopAverageRate = averageRate > 0 ? averageRate : DEFAULT_AVERAGE_RATE;
  const desktopAccumulatedEarnings =
    accumulatedEarnings > 0 ? accumulatedEarnings : DEFAULT_ACCUMULATED_EARNINGS;
  const desktopMonthlyGrowth =
    monthlyGrowth !== 0 || items.length > 0 ? monthlyGrowth : DEFAULT_MONTHLY_GROWTH;
  const desktopSparklinePoints =
    sortedItems.length > 0 ? sparklinePoints : DESKTOP_FALLBACK_SPARKLINE;

  const growthChipClassName =
    monthlyGrowth >= 0
      ? 'bg-[#3AD9A8]/18 text-[#7DFFE0]'
      : 'bg-[#FF8CA9]/18 text-[#FFD6E0]';

  return (
    <>
      <DashboardLayout avatarUrl={avatarUrl} displayName={profileName} profileRole="Inversionista">
        {loading ? (
          <DesktopPortfolioLoading />
        ) : (
          <div className="space-y-4">
            <PortfolioHero
              averageRate={desktopAverageRate}
              monthlyGrowth={desktopMonthlyGrowth}
              points={desktopSparklinePoints}
              totalPortfolio={desktopTotalPortfolio}
            />
            <StatsCards
              accumulatedEarnings={desktopAccumulatedEarnings}
              averageRate={desktopAverageRate}
              totalPortfolio={desktopTotalPortfolio}
            />
            <InsightCard />
            <ActivityList rows={desktopActivityRows} status={status} />
          </div>
        )}
      </DashboardLayout>

      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(123,92,255,0.10),transparent_36%),linear-gradient(180deg,#F7F8FC_0%,#F4F6FB_100%)] pb-36 text-[#0F172A] lg:hidden">
      <div className="mx-auto w-full max-w-xl px-4 pb-6 pt-4 sm:px-5">
        <header className="mb-7 flex items-start gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-0.5 text-[0.95rem] font-semibold tracking-[-0.03em] text-[#141B34]">
              <span>Invest</span>
              <span className="text-[#6B39F4]">App</span>
              <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#6B39F4]" />
            </div>
            <h1 className="mt-5 text-[2.65rem] font-semibold tracking-[-0.07em] text-[#18213C]">
              My Portfolio
            </h1>
            <p className="mt-1 text-[0.98rem] leading-6 tracking-[-0.02em] text-slate-500">
              Track your portfolio performance and growth
            </p>
          </div>

        </header>

        {loading ? <DashboardSkeleton /> : null}

        {!loading ? (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#7C69FF_0%,#5F4DFF_45%,#5641E7_100%)] px-5 pb-4 pt-5 shadow-[0_28px_60px_rgba(99,77,255,0.32)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    VALUE
                  </p>
                  <p className="mt-3 text-[2.35rem] font-semibold tracking-[-0.06em] text-white">
                    {money(totalPortfolio)}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[0.78rem] font-semibold ${growthChipClassName}`}
                    >
                      {monthlyGrowth >= 0 ? '↑' : '↓'} {Math.abs(monthlyGrowth).toFixed(2)}%
                    </span>
                    <span className="text-[0.78rem] font-medium text-white/60">vs last month</span>
                  </div>
                </div>

                <PortfolioGauge value={averageRate} />
              </div>

              <div className="mt-4">
                <PortfolioSparkline points={sparklinePoints} />
              </div>
            </section>

            <section className="rounded-[30px] border border-white/70 bg-white/94 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <StatRow
                icon={<PortfolioValueIcon />}
                iconClassName="bg-[#F1EBFF] text-[#7C5CFF]"
                label="Total Portfolio"
                value={money(totalPortfolio)}
              />
              <div className="mx-2 h-px bg-slate-100" />
              <StatRow
                icon={<AverageRateIcon />}
                iconClassName="bg-[#E7FBF4] text-[#20C997]"
                label="Average Rate"
                value={percent(averageRate)}
              />
              <div className="mx-2 h-px bg-slate-100" />
              <StatRow
                icon={<EarningsIcon />}
                iconClassName="bg-[#F1EBFF] text-[#7C5CFF]"
                label="Accumulated Earnings"
                value={money(accumulatedEarnings)}
              />
            </section>

            <section className="rounded-[28px] border border-[#DDF5EE] bg-[linear-gradient(135deg,#F5FFFB_0%,#F1FFFB_45%,#EEF8FF_100%)] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-[#20C997] shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
                  <TrendUpIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[1rem] font-semibold tracking-[-0.03em] text-[#0E8B65]">
                    Great job!
                  </p>
                  <p className="mt-1 text-sm leading-6 tracking-[-0.02em] text-slate-600">
                    Your portfolio is up to date on{' '}
                    <span className="font-semibold text-[#0E8B65]">{portfolioHealthShare}%</span>{' '}
                    of tracked repayments.
                  </p>
                </div>
                <PerformanceMiniChart />
              </div>
            </section>

            <section className="pt-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[1.02rem] font-semibold tracking-[-0.03em] text-[#1C2340]">
                    Recent Activity
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {items.length} investment{items.length === 1 ? '' : 's'} tracked
                  </p>
                </div>
                <Link
                  href="/history"
                  className="text-sm font-semibold tracking-[-0.02em] text-[#7C5CFF] transition hover:text-[#5B48FF]"
                >
                  View all
                </Link>
              </div>

              {status ? (
                <div className="mb-3 rounded-[24px] border border-rose-100 bg-rose-50/90 px-4 py-4 text-sm text-rose-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  {status}
                </div>
              ) : null}

              <div className="space-y-3">
                {recentItems.length === 0 ? (
                  <div className="rounded-[26px] border border-white/70 bg-white/92 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                    <p className="text-base font-semibold tracking-[-0.03em] text-[#1C2340]">
                      No investments yet
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Once you fund a venture, your portfolio activity and performance will appear
                      here.
                    </p>
                    <Link
                      href="/feed"
                      className="mt-4 inline-flex items-center rounded-full bg-[#6B39F4] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(107,57,244,0.22)] transition hover:bg-[#5B31CF]"
                    >
                      Explore ventures
                    </Link>
                  </div>
                ) : (
                  recentItems.map((item) => {
                    const healthMeta = getHealthMeta(item.health);

                    return (
                      <Link
                        key={item.id}
                        href={`/feed/${item.projectId}`}
                        className="block rounded-[26px] border border-white/70 bg-white/94 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F1EBFF] text-[#7C5CFF]">
                            {item.coverImage ? (
                              <img
                                src={item.coverImage}
                                alt={item.businessName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ActivityGlyphIcon />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[1rem] font-semibold tracking-[-0.03em] text-[#1C2340]">
                                  {item.businessName}
                                </p>
                                <p className="mt-0.5 text-sm text-slate-500">Investment</p>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${healthMeta.badgeClassName}`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${healthMeta.dotClassName}`}
                                  />
                                  {healthMeta.label}
                                </span>
                                <p className="mt-2 text-xs font-medium text-slate-400">
                                  {formatActivityTimestamp(item.createdAt)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                              <p className="text-sm text-slate-500">Next repayment</p>
                              <p className="text-sm font-semibold text-slate-800">
                                {item.nextRepaymentLabel}
                              </p>
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-3">
                              <p className="text-sm text-slate-500">Invested amount</p>
                              <p className="text-base font-semibold tracking-[-0.03em] text-slate-900">
                                {money(item.amountInvested)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>

      <BottomNav />
      </main>
    </>
  );
}
