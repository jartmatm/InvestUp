'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import BottomNav from '@/components/BottomNav';
import { DesktopSidebarIcon } from '@/components/DesktopSidebarIcon';
import DesktopUpgradeCard from '@/components/DesktopUpgradeCard';
import { useInvestApp } from '@/lib/investapp-context';
import { getPendingInvestment } from '@/lib/pending-investment';
import { useUserProfileSummary } from '@/lib/use-user-profile-summary';

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

      <span className="text-sm font-medium text-white/78">
        {totalCount > 0 ? `${totalCount} recent contact${totalCount === 1 ? '' : 's'}` : 'No recent contacts yet'}
      </span>
    </div>
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
            Transfer
          </p>
          <h2 className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-white">
            Send funds
          </h2>
          <p className="mt-3 text-sm leading-6 tracking-[-0.02em] text-white/86">
            Enter an InvestApp email manually or pick one of your recent contacts.
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
            Transfer
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

type DesktopTransactionStatus = 'Success' | 'Pending' | 'Failed';

type DesktopTransaction = {
  id: string;
  contact: string;
  detail: string;
  type: string;
  amount: string;
  status: DesktopTransactionStatus;
  date: string;
};

const MOCK_DESKTOP_CONTACTS: ContactItem[] = [
  {
    id: 'mock-satoshi',
    displayName: 'Satoshi Nakamoto',
    email: 'satoshi@investapp.test',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80',
    walletAddress: '0x1111111111111111111111111111111111111111',
  },
  {
    id: 'mock-maria',
    displayName: 'Maria Gonzalez',
    email: 'maria@investapp.test',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
    walletAddress: '0x2222222222222222222222222222222222222222',
  },
  {
    id: 'mock-james',
    displayName: 'James Lee',
    email: 'james@investapp.test',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80',
    walletAddress: '0x3333333333333333333333333333333333333333',
  },
  {
    id: 'mock-alex',
    displayName: 'Alex Kim',
    email: 'alex@investapp.test',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80',
    walletAddress: '0x4444444444444444444444444444444444444444',
  },
  {
    id: 'mock-elisa',
    displayName: 'Elisa Martinez',
    email: 'elisa@investapp.test',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    walletAddress: '0x5555555555555555555555555555555555555555',
  },
  {
    id: 'mock-david',
    displayName: 'David Rivera',
    email: 'david@investapp.test',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
    walletAddress: '0x6666666666666666666666666666666666666666',
  },
];

const DESKTOP_TRANSACTIONS: DesktopTransaction[] = [
  {
    id: 'tx-1',
    contact: 'Maria G.',
    detail: 'Wallet transfer',
    type: 'Send Money',
    amount: '-$1,250.00',
    status: 'Success',
    date: 'Today, 9:42 AM',
  },
  {
    id: 'tx-2',
    contact: 'Satoshi N.',
    detail: 'Venture allocation',
    type: 'Invest',
    amount: '-$4,800.00',
    status: 'Pending',
    date: 'Yesterday',
  },
  {
    id: 'tx-3',
    contact: 'Alex K.',
    detail: 'Returned transfer',
    type: 'Withdraw',
    amount: '$920.00',
    status: 'Failed',
    date: 'May 4',
  },
  {
    id: 'tx-4',
    contact: 'Elisa M.',
    detail: 'Incoming wallet funds',
    type: 'Receive',
    amount: '$2,100.00',
    status: 'Success',
    date: 'May 2',
  },
];

function InvestAppLogo() {
  return (
    <div className="flex items-center gap-0.5 text-[1.55rem] font-semibold tracking-[-0.07em] text-[#111827]">
      <span>Invest</span>
      <span className="text-[#6B39F4]">App</span>
      <span className="ml-0.5 mt-0.5 h-2.5 w-2.5 rounded-full bg-[#6B39F4]" />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16.7 16.7A7.5 7.5 0 1 0 5.3 5.3a7.5 7.5 0 0 0 11.4 11.4Z" />
      <path d="M16.7 16.7 21 21" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4a5 5 0 0 0-5 5v3c0 .9-.3 1.8-.9 2.5L5 16h14l-1.1-1.5A4 4 0 0 1 17 12V9a5 5 0 0 0-5-5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

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

function QuickActionIcon({ type }: { type: string }) {
  const common = {
    className: 'h-5 w-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (type === 'send') return <ArrowLaunchIcon />;
  if (type === 'receive') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M12 4v12" />
        <path d="m6 10 6 6 6-6" />
        <path d="M5 20h14" />
      </svg>
    );
  }
  if (type === 'withdraw') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M12 20V8" />
        <path d="m6 14 6-6 6 6" />
        <path d="M5 4h14" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M5 5v6h6" />
      <path d="M19 19v-6h-6" />
      <path d="M19 13a7 7 0 0 0-12-5l-2 3" />
      <path d="M5 11a7 7 0 0 0 12 5l2-3" />
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
      <Sidebar profileRole={profileRole} />
      <main className="ml-[260px] flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar avatarUrl={avatarUrl} displayName={displayName} profileRole={profileRole} />
        {children}
      </main>
    </div>
  );
}

function Sidebar({ profileRole }: { profileRole: string }) {
  const primaryItems = [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/portfolio', label: 'Portfolio', icon: 'portfolio' },
    { href: '/invest', label: 'Send', icon: 'transfer', active: true },
    { href: '/feed', label: 'Feed', icon: 'feed' },
    { href: '/profile', label: 'Profile', icon: 'profile' },
  ];
  const secondaryItems = [
    { href: '/home?topup=1', label: 'Top up', icon: 'topup' },
    { href: '/withdraw', label: 'Withdraw', icon: 'withdraw' },
    { href: '/contracts', label: 'Documents', icon: 'documents' },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-[#E7EAF3] bg-white/94 px-5 py-6 shadow-[12px_0_50px_rgba(21,28,44,0.04)] backdrop-blur-xl">
      <InvestAppLogo />

      <nav className="mt-9 space-y-1.5">
        {primaryItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition ${
              item.active
                ? 'bg-[#F2EDFF] text-[#6B39F4] shadow-[0_12px_28px_rgba(107,57,244,0.10)]'
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
          {profileRole}
        </p>
        <div className="mt-3 space-y-1.5">
          {secondaryItems.map((item) => (
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

      <DesktopUpgradeCard />
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
    <header className="sticky top-0 z-20 flex h-[86px] items-center justify-between gap-8 border-b border-[#E7EAF3] bg-white/86 px-8 backdrop-blur-xl">
      <div className="ml-auto flex items-center gap-4">
        <label className="relative block w-[360px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA4B7]">
            <SearchIcon />
          </span>
          <input
            placeholder="Search contacts, wallets or transfers..."
            className="h-11 w-full rounded-2xl border border-[#DDE2EE] bg-white pl-12 pr-4 text-sm font-medium text-[#182033] outline-none shadow-[0_12px_28px_rgba(21,28,44,0.04)] transition placeholder:text-[#9BA5B8] focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10"
          />
        </label>

        <Link
          href="/invest/wallet?mode=transfer"
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7C5CFF_0%,#5B2FF4_100%)] px-4 text-sm font-bold text-white shadow-[0_18px_36px_rgba(107,57,244,0.22)] transition hover:-translate-y-0.5"
        >
          <AddContactIcon />
          New transfer
        </Link>

        <button
          type="button"
          className="relative grid h-11 w-11 place-items-center rounded-2xl border border-[#E7EAF3] bg-white text-[#1F2A44] shadow-[0_12px_28px_rgba(21,28,44,0.05)] transition hover:-translate-y-0.5"
          aria-label="Notifications"
        >
          <BellIcon />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#6B39F4]" />
        </button>

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
        </div>
      </div>
    </header>
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/78">Transfer</p>
            <h2 className="mt-5 text-[2.15rem] font-bold leading-tight tracking-[-0.06em] text-white">
              Send to a Wallet
            </h2>
            <p className="mt-4 text-base leading-7 text-white/88">
              Enter a wallet address manually or pick one of your recent contacts.
            </p>
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
  return (
    <Link
      href={href}
      className="group relative min-h-[320px] overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#FFC85C_0%,#FFAA23_42%,#F59A0B_100%)] p-8 text-white shadow-[0_28px_70px_rgba(255,171,35,0.24)] transition duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_34px_86px_rgba(255,171,35,0.30)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_34%)]" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-[390px]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/78">Transfer</p>
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

function QuickActions({ walletHref }: { walletHref: string }) {
  const actions = [
    { href: walletHref, label: 'Send Money', detail: 'Wallet or contact', icon: 'send' },
    { href: '/invest/wallet', label: 'Receive', detail: 'Share wallet', icon: 'receive' },
    { href: '/withdraw', label: 'Withdraw', detail: 'Off-ramp funds', icon: 'withdraw' },
    { href: '/history', label: 'Transfer History', detail: 'Review activity', icon: 'history' },
  ];

  return (
    <section className="grid grid-cols-4 gap-4">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="group rounded-[22px] border border-[#E9ECF4] bg-white p-5 shadow-[0_18px_38px_rgba(21,28,44,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_58px_rgba(21,28,44,0.11)]"
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F2EDFF] text-[#6B39F4] transition group-hover:scale-105">
            <QuickActionIcon type={action.icon} />
          </span>
          <p className="mt-4 text-sm font-bold text-[#111827]">{action.label}</p>
          <p className="mt-1 text-xs font-medium text-[#77839A]">{action.detail}</p>
        </Link>
      ))}
    </section>
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
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold tracking-[-0.04em] text-[#111827]">Recent contacts</h2>
        <Link href={walletHref} className="inline-flex items-center gap-1 text-sm font-bold text-[#6B39F4]">
          View all
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
          <span className="mt-3 text-sm font-semibold text-[#2A3245]">New contact</span>
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
  return (
    <section className="rounded-[24px] border border-[#EEE9FF] bg-[linear-gradient(135deg,#F7F3FF_0%,#F2F0FF_100%)] p-6 shadow-[0_18px_38px_rgba(107,57,244,0.08)]">
      <div className="flex items-center gap-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#EEE7FF] text-[#6B39F4]">
          <ShieldIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[#111827]">Your security matters</h2>
          <p className="mt-1 text-sm font-medium text-[#66728A]">
            All transfers are encrypted and protected with industry-leading security.
          </p>
        </div>
        <Link
          href="/profile/privacy-policy"
          className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#6B39F4] shadow-[0_12px_28px_rgba(107,57,244,0.10)] transition hover:-translate-y-0.5"
          aria-label="Review security details"
        >
          <ChevronRightIcon />
        </Link>
      </div>
    </section>
  );
}

function TransactionsTable() {
  const statusClassNames: Record<DesktopTransactionStatus, string> = {
    Success: 'bg-[#E9FFF4] text-[#12895B]',
    Pending: 'bg-[#FFF7DA] text-[#A46A00]',
    Failed: 'bg-[#FFF0F0] text-[#C24141]',
  };

  return (
    <section className="rounded-[24px] border border-[#E9ECF4] bg-white p-6 shadow-[0_18px_38px_rgba(21,28,44,0.06)]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-[-0.04em] text-[#111827]">Activity</h2>
          <p className="mt-1 text-sm font-medium text-[#66728A]">Latest wallet and investment movements</p>
        </div>
        <Link href="/history" className="text-sm font-bold text-[#6B39F4]">
          View ledger
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#EEF1F7]">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[#F8F9FB] text-xs font-bold uppercase tracking-[0.12em] text-[#8D97AA]">
            <tr>
              <th className="px-5 py-4">Contact</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF1F7]">
            {DESKTOP_TRANSACTIONS.map((transaction) => (
              <tr key={transaction.id} className="transition hover:bg-[#FBFCFF]">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#F2EDFF] text-sm font-bold text-[#6B39F4]">
                      {initialsFrom(transaction.contact)}
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-[#111827]">{transaction.contact}</span>
                      <span className="block text-xs font-medium text-[#7A8498]">{transaction.detail}</span>
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-[#3A465C]">{transaction.type}</td>
                <td className="px-5 py-4 text-sm font-bold text-[#111827]">{transaction.amount}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClassNames[transaction.status]}`}>
                    {transaction.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm font-medium text-[#7A8498]">{transaction.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SendDashboard({
  avatarUrl,
  contacts,
  displayName,
  loadingContacts,
  opportunityHref,
  profileRole,
  secondaryCta,
  secondaryDescription,
  secondaryTitle,
  totalContactCount,
  walletHref,
}: {
  avatarUrl: string;
  contacts: ContactItem[];
  displayName: string;
  loadingContacts: boolean;
  opportunityHref: string;
  profileRole: string;
  secondaryCta: string;
  secondaryDescription: string;
  secondaryTitle: string;
  totalContactCount: number;
  walletHref: string;
}) {
  return (
    <DashboardLayout avatarUrl={avatarUrl} displayName={displayName} profileRole={profileRole}>
      <div className="mx-auto w-full max-w-[1480px] space-y-7 px-8 py-8">
        <section className="grid grid-cols-2 gap-6">
          <SendWalletCard contacts={contacts} href={walletHref} totalCount={totalContactCount} />
          <InvestCard
            ctaLabel={secondaryCta}
            description={secondaryDescription}
            href={opportunityHref}
            title={secondaryTitle}
          />
        </section>

        <QuickActions walletHref={walletHref} />
        <RecentContacts contacts={contacts} loading={loadingContacts} walletHref={walletHref} />
        <SecurityCard />
        <TransactionsTable />
      </div>
    </DashboardLayout>
  );
}

export default function InvestPage() {
  const router = useRouter();
  const { user } = usePrivy();
  const { faseApp, rolSeleccionado, walletTargets, loadingWallets, cargarWalletsObjetivo } =
    useInvestApp();
  const { avatarUrl, displayName, email } = useUserProfileSummary();
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

  const recentContacts = useMemo<ContactItem[]>(
    () =>
      walletTargets
        .filter((target) => target.wallet_address)
        .map((target) => ({
          id: target.id,
          displayName: `${target.name ?? ''} ${target.surname ?? ''}`.trim() || target.email?.trim() || 'InvestApp user',
          email: target.email,
          avatarUrl: target.avatar_url,
          walletAddress: target.wallet_address ?? '',
        }))
        .slice(0, 12),
    [walletTargets]
  );

  const walletHref = '/invest/wallet?mode=transfer';
  const opportunityHref = rolSeleccionado === 'inversor' ? '/feed' : '/invest/repayments';
  const secondaryTitle = rolSeleccionado === 'inversor' ? 'Invest' : 'Send repayment';
  const secondaryDescription =
    rolSeleccionado === 'inversor'
      ? 'Open ventures and pick a business to invest with a prefilled transfer flow.'
      : 'Review your investors and launch protected repayment flows with prefilled details.';
  const secondaryCta =
    rolSeleccionado === 'inversor'
      ? 'Explore high-growth opportunities'
      : 'Review investor repayment flows';
  const desktopContacts = recentContacts.length > 0 ? recentContacts : MOCK_DESKTOP_CONTACTS;
  const desktopContactCount = recentContacts.length > 0 ? recentContacts.length : 12;
  const profileDisplayName = displayName || email || 'InvestApp user';
  const profileRoleLabel = rolSeleccionado === 'emprendedor' ? 'Emprendedor' : 'Inversionista';

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
                Send Money
              </h1>
              <p className="mt-1 text-[0.98rem] leading-6 tracking-[-0.02em] text-slate-500">
                Preparing your investment transfer
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
                Send Money
              </h1>
              <p className="mt-1 text-[0.98rem] leading-6 tracking-[-0.02em] text-slate-500">
                Choose how you want to move funds
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
                  Recent contacts
                </h2>
                <Link
                  href={walletHref}
                  className="inline-flex items-center gap-1 text-sm font-semibold tracking-[-0.02em] text-[#7C5CFF] transition hover:text-[#5B48FF]"
                >
                  View all
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
                      New contact
                    </span>
                  </Link>

                  {loadingWallets ? (
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
                      Your recent contacts will appear here after your first transfer.
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
                    Your security matters
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    All transfers are encrypted and protected with industry-leading security.
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
        avatarUrl={avatarUrl}
        contacts={desktopContacts}
        displayName={profileDisplayName}
        loadingContacts={loadingWallets && recentContacts.length === 0}
        opportunityHref={opportunityHref}
        profileRole={profileRoleLabel}
        secondaryCta={secondaryCta}
        secondaryDescription={secondaryDescription}
        secondaryTitle={secondaryTitle}
        totalContactCount={desktopContactCount}
        walletHref={walletHref}
      />
    </>
  );
}
