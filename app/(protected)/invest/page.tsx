'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useLocale, useTranslations } from 'next-intl';
import BottomNav from '@/components/BottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import DesktopTopbar from '@/components/DesktopTopbar';
import { useInvestApp } from '@/lib/investapp-context';
import { getPendingInvestment } from '@/lib/pending-investment';
import { useUserProfileSummary } from '@/lib/use-user-profile-summary';
import { fetchCurrentUserTransactions } from '@/utils/client/current-user-transactions';
import type { CurrentUserTransaction, TransactionStatus } from '@/utils/transactions/current-user';

type ContactItem = {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  walletAddress: string;
};

const initialsFrom = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';

const firstNameFromContact = (contact: ContactItem) => {
  const fromName = contact.displayName.trim().split(/\s+/)[0];
  if (fromName && !fromName.includes('@')) return fromName;
  const emailName = contact.email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  return emailName?.split(/\s+/)[0] || fromName || 'User';
};

function ArrowLaunchIcon() {
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
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function AddContactIcon() {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 3l7 3v5c0 5.25-3.25 8.75-7 10-3.75-1.25-7-4.75-7-10V6l7-3Z" />
      <path d="M9.5 12.5l1.8 1.8 3.8-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
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
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function WalletIllustration() {
  return (
    <svg viewBox="0 0 180 120" className="h-[108px] w-[156px] opacity-95">
      <defs>
        <linearGradient id="wallet-hero-card" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
        </linearGradient>
      </defs>
      <circle cx="138" cy="18" r="10" fill="rgba(255,255,255,0.14)" />
      <circle cx="118" cy="96" r="7" fill="rgba(255,255,255,0.10)" />
      <circle cx="22" cy="30" r="6" fill="rgba(255,255,255,0.16)" />
      <path
        d="M14 108C46 92 70 94 102 102C132 110 151 108 173 96"
        fill="none"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g transform="translate(60 26) rotate(10)">
        <rect x="0" y="10" width="78" height="52" rx="16" fill="url(#wallet-hero-card)" />
        <rect x="52" y="24" width="32" height="24" rx="10" fill="rgba(255,255,255,0.18)" />
        <circle cx="64" cy="36" r="4" fill="rgba(255,255,255,0.50)" />
        <circle cx="20" cy="18" r="7" fill="rgba(255,255,255,0.18)" />
      </g>
    </svg>
  );
}

function GrowthIllustration() {
  return (
    <svg viewBox="0 0 180 120" className="h-[108px] w-[156px] opacity-95">
      <path
        d="M18 102C52 92 71 84 96 72C118 62 136 48 164 32"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M151 33h12v12"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="26" y="78" width="16" height="24" rx="5" fill="rgba(255,255,255,0.20)" />
      <rect x="54" y="66" width="16" height="36" rx="5" fill="rgba(255,255,255,0.24)" />
      <rect x="82" y="54" width="16" height="48" rx="5" fill="rgba(255,255,255,0.28)" />
      <rect x="110" y="42" width="16" height="60" rx="5" fill="rgba(255,255,255,0.34)" />
      <rect x="138" y="26" width="16" height="76" rx="5" fill="rgba(255,255,255,0.40)" />
    </svg>
  );
}

function ContactAvatar({
  avatarUrl,
  label,
  sizeClassName = 'h-10 w-10',
  textClassName = 'text-xs',
}: {
  avatarUrl: string | null;
  label: string;
  sizeClassName?: string;
  textClassName?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-full border border-white/70 bg-white/70 ${sizeClassName}`}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center font-semibold text-[#6B39F4] ${textClassName}`}
        >
          {initialsFrom(label)}
        </div>
      )}
      <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border border-white bg-[#37D39F]" />
    </div>
  );
}

function RecentPreview({
  contacts,
  totalCount,
}: {
  contacts: ContactItem[];
  totalCount: number;
}) {
  const preview = contacts.slice(0, 3);
  const extraCount = Math.max(totalCount - preview.length, 0);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center">
        {preview.map((contact, index) => (
          <div
            key={contact.id}
            className={index === 0 ? '' : '-ml-2.5'}
            style={{ zIndex: preview.length - index }}
          >
            <ContactAvatar avatarUrl={contact.avatarUrl} label={contact.displayName} />
          </div>
        ))}
        {extraCount > 0 ? (
          <div className="-ml-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/88 text-xs font-semibold text-[#7C5CFF]">
            +{extraCount}
          </div>
        ) : null}
      </div>

      <RecentPreviewLabel totalCount={totalCount} />
    </div>
  );
}

function RecentPreviewLabel({ totalCount }: { totalCount: number }) {
  const t = useTranslations('Send');

  return (
    <span className="text-sm font-medium text-white/78">
      {totalCount > 0 ? t('recentContactsCount', { count: totalCount }) : t('noRecentContacts')}
    </span>
  );
}

function WalletHeroCard({
  href,
  previewContacts,
  totalCount,
}: {
  href: string;
  previewContacts: ContactItem[];
  totalCount: number;
}) {
  const t = useTranslations('Send');
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#54E0D2_0%,#31C8BC_48%,#21B7AC_100%)] px-5 pb-5 pt-5 text-white shadow-[0_26px_60px_rgba(49,200,188,0.28)] transition hover:-translate-y-0.5"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_34%)]" />
      <div className="absolute -right-10 bottom-0 h-28 w-40 rounded-full bg-white/12 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="max-w-[220px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/74">
            {t('transfer')}
          </p>
          <h2 className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-white">
            {t('sendFunds')}
          </h2>
          <p className="mt-3 text-sm leading-6 tracking-[-0.02em] text-white/86">
            {t('sendFundsDescription')}
          </p>
        </div>

        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#25B8AC] shadow-[0_18px_30px_rgba(255,255,255,0.20)] transition group-hover:translate-x-0.5">
          <ArrowLaunchIcon />
        </span>
      </div>

      <div className="relative mt-5 flex items-end justify-between gap-3">
        <RecentPreview contacts={previewContacts} totalCount={totalCount} />
        <WalletIllustration />
      </div>
    </Link>
  );
}

function InvestHeroCard({
  href,
  title,
  description,
  ctaLabel,
}: {
  href: string;
  title: string;
  description: string;
  ctaLabel: string;
}) {
  const t = useTranslations('Send');
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#FFC557_0%,#FFB138_45%,#F29A0E_100%)] px-5 pb-5 pt-5 text-white shadow-[0_26px_60px_rgba(255,177,56,0.28)] transition hover:-translate-y-0.5"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.20),transparent_34%)]" />
      <div className="absolute -left-10 bottom-0 h-24 w-36 rounded-full bg-white/12 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="max-w-[220px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/74">
            {t('transfer')}
          </p>
          <h2 className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-white">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-6 tracking-[-0.02em] text-white/86">{description}</p>
        </div>

        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#F29A0E] shadow-[0_18px_30px_rgba(255,255,255,0.20)] transition group-hover:translate-x-0.5">
          <ArrowLaunchIcon />
        </span>
      </div>

      <div className="relative mt-5 flex items-end justify-between gap-3">
        <span className="inline-flex items-center rounded-full bg-white/16 px-4 py-2.5 text-sm font-semibold tracking-[-0.02em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
          {ctaLabel}
        </span>
        <GrowthIllustration />
      </div>
    </Link>
  );
}

function ContactsSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {[0, 1, 2, 3, 4].map((key) => (
        <div key={key} className="flex w-[72px] shrink-0 flex-col items-center gap-2 animate-pulse">
          <div className="h-14 w-14 rounded-full bg-white/90" />
          <div className="h-3 w-14 rounded-full bg-white/90" />
        </div>
      ))}
    </div>
  );
}

const truncateWallet = (value: string | null | undefined) => {
  if (!value) return '';
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
};

const isSameWallet = (left: string | null | undefined, right: string | null | undefined) =>
  Boolean(left && right && left.toLowerCase() === right.toLowerCase());

const getCounterpartyWallet = (transaction: CurrentUserTransaction, currentWallet?: string) => {
  if (isSameWallet(transaction.from_wallet, currentWallet)) return transaction.to_wallet;
  if (isSameWallet(transaction.to_wallet, currentWallet)) return transaction.from_wallet;
  return transaction.to_wallet ?? transaction.from_wallet;
};

const getTransactionDirection = (
  transaction: CurrentUserTransaction,
  currentWallet?: string
) => {
  if (isSameWallet(transaction.from_wallet, currentWallet)) return 'outgoing';
  if (isSameWallet(transaction.to_wallet, currentWallet)) return 'incoming';
  if (transaction.movement_type === 'withdrawal' || transaction.movement_type === 'investment') {
    return 'outgoing';
  }
  return 'incoming';
};

const formatTransactionAmount = (
  transaction: CurrentUserTransaction,
  locale: string,
  currentWallet?: string
) => {
  const value = Number(transaction.amount ?? 0);
  const formatted = new Intl.NumberFormat(locale, {
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(Math.abs(Number.isFinite(value) ? value : 0));

  return `${getTransactionDirection(transaction, currentWallet) === 'outgoing' ? '-' : '+'}${formatted}`;
};

const formatTransactionDate = (value: string, locale: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(date);
};

function DesktopIcon({ type }: { type: string }) {
  const common = {
    className: 'h-5 w-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (type === 'home') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M4 10.5 12 4l8 6.5V20H5.5A1.5 1.5 0 0 1 4 18.5v-8Z" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  if (type === 'feed') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <rect x="5" y="4" width="14" height="16" rx="3" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    );
  }

  if (type === 'explore') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="m14.8 9.2-1.6 4-4 1.6 1.6-4 4-1.6Z" />
      </svg>
    );
  }

  if (type === 'portfolio' || type === 'analytics') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M4 19V5" />
        <path d="M8 19v-7" />
        <path d="M12 19V8" />
        <path d="M16 19v-4" />
        <path d="M20 19V9" />
      </svg>
    );
  }

  if (type === 'investments') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M4 17 9 12l4 4 7-8" />
        <path d="M14 8h6v6" />
      </svg>
    );
  }

  if (type === 'documents') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M7 3h7l4 4v14H7V3Z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </svg>
    );
  }

  if (type === 'profile') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </svg>
    );
  }

  if (type === 'wallet') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M4 7h15a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2V7Z" />
        <path d="M4 7l2-3h12v3" />
        <path d="M17 13h.01" />
      </svg>
    );
  }

  if (type === 'transactions') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M7 7h10M7 12h10M7 17h6" />
        <path d="M4 4h16v16H4V4Z" />
      </svg>
    );
  }

  if (type === 'settings') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3-.2-.1a1.7 1.7 0 0 0-2 .1 7.8 7.8 0 0 1-1.4.6 1.7 1.7 0 0 0-1.2 1.6V22H9v-.2a1.7 1.7 0 0 0-1.2-1.6 7.8 7.8 0 0 1-1.4-.6 1.7 1.7 0 0 0-2-.1l-.2.1-2-3 .1-.1a1.7 1.7 0 0 0 .3-1.9 7 7 0 0 1-.2-1.5A1.7 1.7 0 0 0 1 11.5H1v-3h.2a1.7 1.7 0 0 0 1.5-1.3 7 7 0 0 1 .6-1.4 1.7 1.7 0 0 0-.1-2l-.1-.2 3-2 .1.2a1.7 1.7 0 0 0 1.9.3 7 7 0 0 1 1.5-.4A1.7 1.7 0 0 0 11 0h2v.2a1.7 1.7 0 0 0 1.4 1.5 7 7 0 0 1 1.5.4 1.7 1.7 0 0 0 1.9-.3l.1-.2 3 2-.1.2a1.7 1.7 0 0 0-.1 2 7 7 0 0 1 .6 1.4 1.7 1.7 0 0 0 1.5 1.3h.2v3h-.2a1.7 1.7 0 0 0-1.5 1.3 7 7 0 0 1-.6 1.4Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M21 12H3" />
      <path d="m14 5 7 7-7 7" />
    </svg>
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
    <div className="investapp-desktop-autofit hidden min-h-screen bg-[#F8F9FB] text-[#111827] lg:flex">
      <DesktopSidebar roleLabel={profileRole} />
      <main className="ml-[260px] flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar avatarUrl={avatarUrl} displayName={displayName} profileRole={profileRole} />
        {children}
      </main>
    </div>
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
  const t = useTranslations('Send');
  return (
    <DesktopTopbar
      avatarUrl={avatarUrl}
      displayName={displayName}
      roleLabel={profileRole}
      searchPlaceholder={t('searchPlaceholder')}
    />
  );
}

function SendWalletCard({
  contacts,
  href,
  totalCount,
}: {
  contacts: ContactItem[];
  href: string;
  totalCount: number;
}) {
  const t = useTranslations('Send');
  return (
    <Link
      href={href}
      className="group relative min-h-[320px] overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#55E0D2_0%,#35C9BC_48%,#22B4AA_100%)] p-8 text-white shadow-[0_28px_70px_rgba(49,200,188,0.24)] transition duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_34px_86px_rgba(49,200,188,0.30)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_34%)]" />
      <div className="absolute -bottom-16 left-0 h-36 w-full rounded-[50%] border border-white/14" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-[360px]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/78">{t('transfer')}</p>
            <h2 className="mt-5 text-[2.15rem] font-bold leading-tight tracking-[-0.06em] text-white">
              {t('sendToWallet')}
            </h2>
            <p className="mt-4 text-base leading-7 text-white/88">{t('sendToWalletDescription')}</p>
          </div>
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-[#20B5A9] shadow-[0_20px_34px_rgba(255,255,255,0.22)] transition group-hover:translate-x-1">
            <ArrowLaunchIcon />
          </span>
        </div>

        <div className="relative mt-8 flex items-end justify-between gap-6">
          <RecentPreview contacts={contacts} totalCount={totalCount} />
          <div className="pointer-events-none scale-125 opacity-90">
            <WalletIllustration />
          </div>
        </div>
      </div>
    </Link>
  );
}

function InvestCard({
  ctaLabel,
  description,
  href,
  title,
}: {
  ctaLabel: string;
  description: string;
  href: string;
  title: string;
}) {
  const t = useTranslations('Send');
  return (
    <Link
      href={href}
      className="group relative min-h-[320px] overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#FFC85C_0%,#FFAA23_42%,#F59A0B_100%)] p-8 text-white shadow-[0_28px_70px_rgba(255,171,35,0.24)] transition duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_34px_86px_rgba(255,171,35,0.30)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_34%)]" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-[390px]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/78">{t('transfer')}</p>
            <h2 className="mt-5 text-[2.15rem] font-bold leading-tight tracking-[-0.06em] text-white">
              {title}
            </h2>
            <p className="mt-4 text-base leading-7 text-white/90">{description}</p>
          </div>
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-[#F59A0B] shadow-[0_20px_34px_rgba(255,255,255,0.22)] transition group-hover:translate-x-1">
            <ArrowLaunchIcon />
          </span>
        </div>

        <div className="relative mt-8 flex items-end justify-between gap-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/16 px-5 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
            <DesktopIcon type="investments" />
            {ctaLabel}
          </span>
          <div className="pointer-events-none scale-125 opacity-95">
            <GrowthIllustration />
          </div>
        </div>
      </div>
    </Link>
  );
}

function RecentContacts({
  contacts,
  loading,
  walletHref,
}: {
  contacts: ContactItem[];
  loading: boolean;
  walletHref: string;
}) {
  const t = useTranslations('Send');
  const commonT = useTranslations('Common');
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold tracking-[-0.04em] text-[#111827]">{t('recentContacts')}</h2>
        <Link href={walletHref} className="inline-flex items-center gap-1 text-sm font-bold text-[#6B39F4]">
          {commonT('viewAll')}
          <ChevronRightIcon />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-4">
        <Link
          href={walletHref}
          className="flex min-h-[148px] flex-col items-center justify-center rounded-[22px] border border-[#E9ECF4] bg-white p-4 text-center shadow-[0_18px_38px_rgba(21,28,44,0.06)] transition hover:-translate-y-1 hover:shadow-[0_24px_58px_rgba(21,28,44,0.11)]"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#F1EBFF] text-[#7C5CFF]">
            <AddContactIcon />
          </span>
          <span className="mt-3 text-sm font-semibold text-[#2A3245]">{t('newContact')}</span>
        </Link>

        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`desktop-contact-loading-${index}`}
                className="min-h-[148px] animate-pulse rounded-[22px] border border-[#E9ECF4] bg-white shadow-[0_18px_38px_rgba(21,28,44,0.06)]"
              />
            ))
          : contacts.slice(0, 6).map((contact) => (
              <Link
                key={contact.id}
                href={`/invest/wallet?mode=transfer${
                  contact.email ? `&email=${encodeURIComponent(contact.email)}` : ''
                }&wallet=${encodeURIComponent(contact.walletAddress)}`}
                className="flex min-h-[148px] flex-col items-center justify-center rounded-[22px] border border-[#E9ECF4] bg-white p-4 text-center shadow-[0_18px_38px_rgba(21,28,44,0.06)] transition hover:-translate-y-1 hover:shadow-[0_24px_58px_rgba(21,28,44,0.11)]"
              >
                <ContactAvatar
                  avatarUrl={contact.avatarUrl}
                  label={contact.displayName}
                  sizeClassName="h-16 w-16"
                  textClassName="text-sm"
                />
                <span className="mt-3 line-clamp-1 text-sm font-semibold text-[#2A3245]">
                  {firstNameFromContact(contact)}
                </span>
              </Link>
            ))}
      </div>
    </section>
  );
}

function SecurityCard() {
  const t = useTranslations('Send');
  return (
    <section className="rounded-[24px] border border-[#EEE9FF] bg-[linear-gradient(135deg,#F7F3FF_0%,#F2F0FF_100%)] p-6 shadow-[0_18px_38px_rgba(107,57,244,0.08)]">
      <div className="flex items-center gap-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#EEE7FF] text-[#6B39F4]">
          <ShieldIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[#111827]">{t('securityTitle')}</h2>
          <p className="mt-1 text-sm font-medium text-[#66728A]">{t('securityDescription')}</p>
        </div>
        <Link
          href="/profile/privacy-policy"
          className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#6B39F4] shadow-[0_12px_28px_rgba(107,57,244,0.10)] transition hover:-translate-y-0.5"
          aria-label={t('reviewSecurity')}
        >
          <ChevronRightIcon />
        </Link>
      </div>
    </section>
  );
}

function TransactionsTable({
  currentWallet,
  error,
  loading,
  transactions,
  walletTargets,
}: {
  currentWallet?: string;
  error: string;
  loading: boolean;
  transactions: CurrentUserTransaction[];
  walletTargets: ContactItem[];
}) {
  const t = useTranslations('Send');
  const tableT = useTranslations('Tables');
  const locale = useLocale();
  const statusClassNames: Record<TransactionStatus, string> = {
    confirmed: 'bg-[#E9FFF4] text-[#12895B]',
    submitted: 'bg-[#FFF7DA] text-[#A46A00]',
    failed: 'bg-[#FFF0F0] text-[#C24141]',
  };
  const statusLabels: Record<TransactionStatus, string> = {
    confirmed: t('success'),
    submitted: t('pending'),
    failed: t('failed'),
  };
  const movementLabels: Record<CurrentUserTransaction['movement_type'], string> = {
    buy: t('topUp'),
    investment: t('invest'),
    repayment: t('repayment'),
    transfer: t('walletTransfer'),
    withdrawal: t('withdrawal'),
  };
  const walletTargetByAddress = new Map(
    walletTargets
      .filter((target) => target.walletAddress)
      .map((target) => [target.walletAddress.toLowerCase(), target])
  );

  const getCounterpartyLabel = (transaction: CurrentUserTransaction) => {
    const wallet = getCounterpartyWallet(transaction, currentWallet);
    const contact = wallet ? walletTargetByAddress.get(wallet.toLowerCase()) : null;
    return contact?.displayName || contact?.email || truncateWallet(wallet) || t('unknownContact');
  };

  return (
    <section className="rounded-[24px] border border-[#E9ECF4] bg-white p-6 shadow-[0_18px_38px_rgba(21,28,44,0.06)]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-[-0.04em] text-[#111827]">{t('activity')}</h2>
          <p className="mt-1 text-sm font-medium text-[#66728A]">{t('activitySubtitle')}</p>
        </div>
        <Link href="/history" className="text-sm font-bold text-[#6B39F4]">
          {t('viewLedger')}
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#EEF1F7]">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[#F8F9FB] text-xs font-bold uppercase tracking-[0.12em] text-[#8D97AA]">
            <tr>
              <th className="px-5 py-4">{tableT('contact')}</th>
              <th className="px-5 py-4">{tableT('type')}</th>
              <th className="px-5 py-4">{tableT('amount')}</th>
              <th className="px-5 py-4">{tableT('status')}</th>
              <th className="px-5 py-4">{tableT('date')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF1F7]">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <tr key={`activity-loading-${index}`} className="animate-pulse">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-10 rounded-full bg-[#EEF1F7]" />
                      <span className="space-y-2">
                        <span className="block h-3 w-28 rounded-full bg-[#EEF1F7]" />
                        <span className="block h-2.5 w-20 rounded-full bg-[#F2F4F8]" />
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="block h-3 w-20 rounded-full bg-[#EEF1F7]" />
                  </td>
                  <td className="px-5 py-4">
                    <span className="block h-3 w-20 rounded-full bg-[#EEF1F7]" />
                  </td>
                  <td className="px-5 py-4">
                    <span className="block h-6 w-20 rounded-full bg-[#EEF1F7]" />
                  </td>
                  <td className="px-5 py-4">
                    <span className="block h-3 w-24 rounded-full bg-[#EEF1F7]" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center">
                  <p className="text-sm font-bold text-[#111827]">{t('activityLoadError')}</p>
                  <p className="mt-1 text-sm font-medium text-[#7A8498]">{error}</p>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <p className="text-sm font-bold text-[#111827]">{t('noActivityTitle')}</p>
                  <p className="mt-1 text-sm font-medium text-[#7A8498]">
                    {t('noActivityDescription')}
                  </p>
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => {
                const contact = getCounterpartyLabel(transaction);
                return (
                  <tr key={transaction.id} className="transition hover:bg-[#FBFCFF]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#F2EDFF] text-sm font-bold text-[#6B39F4]">
                          {initialsFrom(contact)}
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-[#111827]">{contact}</span>
                          <span className="block text-xs font-medium text-[#7A8498]">
                            {truncateWallet(getCounterpartyWallet(transaction, currentWallet))}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#3A465C]">
                      {movementLabels[transaction.movement_type]}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-[#111827]">
                      {formatTransactionAmount(transaction, locale, currentWallet)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          statusClassNames[transaction.status]
                        }`}
                      >
                        {statusLabels[transaction.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-[#7A8498]">
                      {formatTransactionDate(transaction.created_at, locale)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SendDashboard({
  activityError,
  activityTransactions,
  avatarUrl,
  contacts,
  displayName,
  loadingActivity,
  loadingContacts,
  opportunityHref,
  profileRole,
  secondaryCta,
  secondaryDescription,
  secondaryTitle,
  smartWalletAddress,
  totalContactCount,
  walletHref,
}: {
  activityError: string;
  activityTransactions: CurrentUserTransaction[];
  avatarUrl: string;
  contacts: ContactItem[];
  displayName: string;
  loadingActivity: boolean;
  loadingContacts: boolean;
  opportunityHref: string;
  profileRole: string;
  secondaryCta: string;
  secondaryDescription: string;
  secondaryTitle: string;
  smartWalletAddress?: string;
  totalContactCount: number;
  walletHref: string;
}) {
  return (
    <DashboardLayout avatarUrl={avatarUrl} displayName={displayName} profileRole={profileRole}>
      <div className="w-full space-y-7 px-5 py-5 xl:px-7 2xl:px-9">
        <section className="grid grid-cols-2 gap-6">
          <SendWalletCard contacts={contacts} href={walletHref} totalCount={totalContactCount} />
          <InvestCard
            ctaLabel={secondaryCta}
            description={secondaryDescription}
            href={opportunityHref}
            title={secondaryTitle}
          />
        </section>

        <RecentContacts contacts={contacts} loading={loadingContacts} walletHref={walletHref} />
        <SecurityCard />
        <TransactionsTable
          currentWallet={smartWalletAddress}
          error={activityError}
          loading={loadingActivity}
          transactions={activityTransactions}
          walletTargets={contacts}
        />
      </div>
    </DashboardLayout>
  );
}

export default function InvestPage() {
  const t = useTranslations('Send');
  const roleT = useTranslations('Roles');
  const commonT = useTranslations('Common');
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const {
    faseApp,
    rolSeleccionado,
    smartWalletAddress,
    walletTargets,
    loadingWallets,
    cargarWalletsObjetivo,
  } = useInvestApp();
  const { avatarUrl, displayName, email } = useUserProfileSummary();
  const [activityTransactions, setActivityTransactions] = useState<CurrentUserTransaction[]>([]);
  const [activityUserId, setActivityUserId] = useState('');
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [hasPendingInvestment, setHasPendingInvestment] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(getPendingInvestment(user?.id));
  });

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    void cargarWalletsObjetivo();
  }, [cargarWalletsObjetivo]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncPendingInvestment = () => {
      setHasPendingInvestment(Boolean(getPendingInvestment(user?.id)));
    };

    syncPendingInvestment();
    window.addEventListener('focus', syncPendingInvestment);
    window.addEventListener('storage', syncPendingInvestment);

    return () => {
      window.removeEventListener('focus', syncPendingInvestment);
      window.removeEventListener('storage', syncPendingInvestment);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!hasPendingInvestment) return;
    router.replace('/invest/wallet');
  }, [hasPendingInvestment, router]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let active = true;
    const requestedUserId = user.id;

    const loadActivity = async () => {
      setActivityUserId(requestedUserId);
      setLoadingActivity(true);
      setActivityError('');

      const { data, error } = await fetchCurrentUserTransactions(getAccessToken, { limit: 8 });
      if (!active) return;

      if (error) {
        setActivityTransactions([]);
        setActivityError(error);
        setLoadingActivity(false);
        return;
      }

      setActivityTransactions(
        [...(data ?? [])].sort(
          (left, right) =>
            new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
        )
      );
      setLoadingActivity(false);
    };

    void loadActivity();

    return () => {
      active = false;
    };
  }, [getAccessToken, user?.id]);

  const directoryContacts = useMemo<ContactItem[]>(
    () =>
      walletTargets
        .filter((target) => target.wallet_address)
        .map((target) => ({
          id: target.id,
          displayName:
            `${target.name ?? ''} ${target.surname ?? ''}`.trim() ||
            target.email?.trim() ||
            t('investAppUser'),
          email: target.email,
          avatarUrl: target.avatar_url,
          walletAddress: target.wallet_address ?? '',
        })),
    [t, walletTargets]
  );

  const walletHref = '/invest/wallet?mode=transfer';
  const opportunityHref = rolSeleccionado === 'inversor' ? '/feed' : '/invest/repayments';
  const secondaryTitle = rolSeleccionado === 'inversor' ? t('invest') : t('sendRepayment');
  const secondaryDescription =
    rolSeleccionado === 'inversor'
      ? t('investDescription')
      : t('repaymentDescription');
  const secondaryCta =
    rolSeleccionado === 'inversor'
      ? t('exploreOpportunities')
      : t('repaymentCta');
  const currentUserId = user?.id ?? '';
  const profileDisplayName = displayName || email || t('investAppUser');
  const profileRoleLabel = rolSeleccionado === 'emprendedor' ? roleT('entrepreneur') : roleT('investor');
  const visibleActivityTransactions = useMemo(
    () => (activityUserId === currentUserId ? activityTransactions : []),
    [activityTransactions, activityUserId, currentUserId]
  );
  const visibleActivityError = activityUserId === currentUserId ? activityError : '';
  const visibleActivityLoading =
    Boolean(currentUserId) && (loadingActivity || activityUserId !== currentUserId);
  const recentContacts = useMemo<ContactItem[]>(() => {
    const contactsByWallet = new Map(
      directoryContacts.map((contact) => [contact.walletAddress.toLowerCase(), contact])
    );
    const seenWallets = new Set<string>();

    return visibleActivityTransactions
      .map((transaction) => getCounterpartyWallet(transaction, smartWalletAddress))
      .filter((wallet): wallet is string => Boolean(wallet && wallet.trim()))
      .filter((wallet) => !isSameWallet(wallet, smartWalletAddress))
      .reduce<ContactItem[]>((contacts, wallet) => {
        const normalizedWallet = wallet.toLowerCase();
        if (seenWallets.has(normalizedWallet)) return contacts;
        seenWallets.add(normalizedWallet);

        const directoryContact = contactsByWallet.get(normalizedWallet);
        contacts.push(
          directoryContact ?? {
            id: `wallet-${normalizedWallet}`,
            displayName: truncateWallet(wallet) || t('unknownContact'),
            email: null,
            avatarUrl: null,
            walletAddress: wallet,
          }
        );
        return contacts;
      }, [])
      .slice(0, 12);
  }, [directoryContacts, smartWalletAddress, t, visibleActivityTransactions]);

  if (hasPendingInvestment) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(123,92,255,0.10),transparent_36%),linear-gradient(180deg,#F7F8FC_0%,#F4F6FB_100%)] pb-36 text-[#0F172A]">
        <div className="mx-auto w-full max-w-xl px-4 pb-6 pt-4 sm:px-5">
          <header className="mb-7 flex items-start gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-0.5 text-[0.95rem] font-semibold tracking-[-0.03em] text-[#141B34]">
                <span>Invest</span>
                <span className="text-[#6B39F4]">App</span>
                <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#6B39F4]" />
              </div>
              <h1 className="mt-5 text-[2.65rem] font-semibold tracking-[-0.07em] text-[#18213C]">
                {t('sendMoney')}
              </h1>
              <p className="mt-1 text-[0.98rem] leading-6 tracking-[-0.02em] text-slate-500">
                {t('preparingTransfer')}
              </p>
            </div>

          </header>

          <div className="animate-pulse rounded-[30px] bg-[linear-gradient(135deg,#7C69FF_0%,#5F4DFF_45%,#5641E7_100%)] px-5 pb-5 pt-5 shadow-[0_26px_60px_rgba(99,77,255,0.24)]">
            <div className="h-3 w-24 rounded-full bg-white/25" />
            <div className="mt-5 h-8 w-44 rounded-full bg-white/25" />
            <div className="mt-4 h-4 w-52 rounded-full bg-white/20" />
            <div className="mt-2 h-4 w-40 rounded-full bg-white/16" />
          </div>
        </div>

        <BottomNav />
      </main>
    );
  }

  return (
    <>
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
                {t('sendMoney')}
              </h1>
              <p className="mt-1 text-[0.98rem] leading-6 tracking-[-0.02em] text-slate-500">
                {t('subtitle')}
              </p>
            </div>

          </header>

          <div className="space-y-4">
            <WalletHeroCard
              href={walletHref}
              previewContacts={recentContacts}
              totalCount={recentContacts.length}
            />

            <InvestHeroCard
              href={opportunityHref}
              title={secondaryTitle}
              description={secondaryDescription}
              ctaLabel={secondaryCta}
            />

            <section className="pt-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-[1.02rem] font-semibold tracking-[-0.03em] text-[#1C2340]">
                  {t('recentContacts')}
                </h2>
                <Link
                  href={walletHref}
                  className="inline-flex items-center gap-1 text-sm font-semibold tracking-[-0.02em] text-[#7C5CFF] transition hover:text-[#5B48FF]"
                >
                  {commonT('viewAll')}
                  <ChevronRightIcon />
                </Link>
              </div>

              <div className="-mx-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max gap-4 px-1">
                  <Link
                    href={walletHref}
                    className="flex w-[76px] shrink-0 flex-col items-center gap-2 text-center"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F1EBFF] text-[#7C5CFF] shadow-[0_14px_24px_rgba(107,57,244,0.10)]">
                      <AddContactIcon />
                    </div>
                    <span className="text-xs font-medium tracking-[-0.02em] text-slate-500">
                      {t('newContact')}
                    </span>
                  </Link>

                  {visibleActivityLoading || loadingWallets ? (
                    <ContactsSkeleton />
                  ) : recentContacts.length > 0 ? (
                    recentContacts.map((contact) => (
                      <Link
                        key={contact.id}
                        href={`/invest/wallet?mode=transfer${
                          contact.email ? `&email=${encodeURIComponent(contact.email)}` : ''
                        }&wallet=${encodeURIComponent(contact.walletAddress)}`}
                        className="flex w-[76px] shrink-0 flex-col items-center gap-2 text-center"
                      >
                        <ContactAvatar
                          avatarUrl={contact.avatarUrl}
                          label={contact.displayName}
                          sizeClassName="h-14 w-14"
                          textClassName="text-sm"
                        />
                        <span className="line-clamp-1 text-xs font-medium tracking-[-0.02em] text-slate-600">
                          {firstNameFromContact(contact)}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <div className="flex min-h-[84px] items-center rounded-[24px] border border-dashed border-white/80 bg-white/70 px-4 text-sm text-slate-500 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
                      {t('noRecentContactsMessage')}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[26px] border border-white/80 bg-[linear-gradient(180deg,rgba(243,244,255,0.96),rgba(239,241,251,0.92))] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F1EBFF] text-[#7C5CFF]">
                  <ShieldIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tracking-[-0.02em] text-[#1C2340]">
                    {t('securityTitle')}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {t('securityDescription')}
                  </p>
                </div>
                <span className="text-[#7C5CFF]">
                  <ChevronRightIcon />
                </span>
              </div>
            </section>
          </div>
        </div>

        <BottomNav />
      </main>

      <SendDashboard
        activityError={visibleActivityError}
        activityTransactions={visibleActivityTransactions}
        avatarUrl={avatarUrl}
        contacts={recentContacts}
        displayName={profileDisplayName}
        loadingActivity={visibleActivityLoading}
        loadingContacts={(visibleActivityLoading || loadingWallets) && recentContacts.length === 0}
        opportunityHref={opportunityHref}
        profileRole={profileRoleLabel}
        secondaryCta={secondaryCta}
        secondaryDescription={secondaryDescription}
        secondaryTitle={secondaryTitle}
        smartWalletAddress={smartWalletAddress}
        totalContactCount={recentContacts.length}
        walletHref={walletHref}
      />
    </>
  );
}
