'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useInvestApp } from '@/lib/investapp-context';

type DesktopUserMenuProps = {
  avatarUrl?: string | null;
  displayName: string;
  loading?: boolean;
  roleLabel: string;
  showFavorites?: boolean;
};

type MenuItem = {
  href?: string;
  icon: ReactNode;
  label: string;
  subtitle: string;
  danger?: boolean;
  onClick?: () => void;
};

const initialsFrom = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';

function MenuChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 text-[#73809A] transition duration-200 ${open ? '-rotate-90' : 'rotate-90'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function RowChevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#A7B0C0]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function IconShell({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
        danger ? 'bg-[#FFF1F3] text-[#EF4444]' : 'bg-[#F1ECFF] text-[#6B39F4]'
      }`}
    >
      {children}
    </span>
  );
}

const iconProps = {
  className: 'h-4 w-4',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function IconPersonalData() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function IconSocialMedia() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <path d="M7 8a4 4 0 1 0 0 8" />
      <path d="M17 8a4 4 0 1 1 0 8" />
      <path d="M8 12h8" />
    </svg>
  );
}

function IconReferralCode() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" />
    </svg>
  );
}

function IconBankAccount() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <path d="M4 10h16" />
      <path d="M6 10v8M10 10v8M14 10v8M18 10v8" />
      <path d="M3 20h18M12 3l8 5H4l8-5Z" />
    </svg>
  );
}

function IconFavorites() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <path d="M6.5 6.4C8.3 4.9 10.6 5.4 12 7c1.4-1.6 3.7-2.1 5.5-.6 1.8 1.6 2 4.2.6 6-1.1 1.4-4.1 4.2-5.5 5.5a.9.9 0 0 1-1.2 0c-1.4-1.3-4.4-4.1-5.5-5.5-1.4-1.8-1.1-4.4.6-6Z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1a2.1 2.1 0 0 1-3 3l-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.7V21a2.1 2.1 0 0 1-4.2 0v-.2a1.8 1.8 0 0 0-1.1-1.7 1.8 1.8 0 0 0-2 .4l-.1.1a2.1 2.1 0 0 1-3-3l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.7-1.1H2a2.1 2.1 0 0 1 0-4.2h.2a1.8 1.8 0 0 0 1.7-1.1 1.8 1.8 0 0 0-.4-2l-.1-.1a2.1 2.1 0 1 1 3-3l.1.1a1.8 1.8 0 0 0 2 .4h.1A1.8 1.8 0 0 0 9.7 2V2a2.1 2.1 0 0 1 4.2 0v.2A1.8 1.8 0 0 0 15 3.9a1.8 1.8 0 0 0 2-.4l.1-.1a2.1 2.1 0 1 1 3 3l-.1.1a1.8 1.8 0 0 0-.4 2v.1a1.8 1.8 0 0 0 1.7 1.1H21a2.1 2.1 0 0 1 0 4.2h-.2a1.8 1.8 0 0 0-1.4 1.1Z" />
    </svg>
  );
}

function IconLanguage() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <path d="M5 8h9M9 4v4M4 20l5-12 5 12M6 16h6" />
      <path d="M15 13c1.2 2.5 3 4.2 5 5" />
      <path d="M20 10c-.7 2-1.9 3.7-3.5 5" />
    </svg>
  );
}

function IconHelpCenter() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.7 9a2.5 2.5 0 0 1 4.6 1.4c0 1.8-1.8 2.2-2.3 3.4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconFaq() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <path d="M4 5h16v12H8l-4 4V5Z" />
      <path d="M9 9h6M9 13h4" />
    </svg>
  );
}

function IconPrivacyPolicy() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <path d="M12 3l7 3v5c0 5.2-3.2 8.7-7 10-3.8-1.3-7-4.8-7-10V6l7-3Z" />
      <path d="m9.5 12 1.7 1.7 3.8-4" />
    </svg>
  );
}

function IconTerms() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <path d="M7 3h7l4 4v14H7V3Z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

function IconAboutApp() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v7M12 7h.01" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M14 4h4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4" />
    </svg>
  );
}

function DesktopMenuItem({
  danger,
  href,
  icon,
  label,
  onClick,
  onSelect,
  subtitle,
}: MenuItem & { onSelect: () => void }) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <IconShell danger={danger}>{icon}</IconShell>
        <span className="min-w-0">
          <span className={`block truncate text-[0.83rem] font-bold ${danger ? 'text-[#EF4444]' : 'text-[#111827]'}`}>
            {label}
          </span>
          <span className="mt-0.5 block truncate text-[0.72rem] font-medium text-[#73809A]">{subtitle}</span>
        </span>
      </div>
      <RowChevron />
    </>
  );
  const className = `group flex min-h-[58px] w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition duration-200 focus:outline-none focus:ring-4 ${
    danger
      ? 'bg-[#FFF7F7] hover:bg-[#FFF0F0] focus:ring-[#EF4444]/10'
      : 'hover:bg-[#F8F9FB] focus:ring-[#6B39F4]/10'
  }`;

  if (onClick) {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onSelect();
          onClick();
        }}
        className={className}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={href ?? '/profile'} role="menuitem" onClick={onSelect} className={className}>
      {content}
    </Link>
  );
}

function MenuSection({ items, onSelect, title }: { items: MenuItem[]; onSelect: () => void; title: string }) {
  return (
    <section>
      <p className="px-2 text-[0.64rem] font-bold uppercase tracking-[0.18em] text-[#98A1B5]">{title}</p>
      <div className="mt-2 space-y-1">
        {items.map((item) => (
          <DesktopMenuItem key={item.label} {...item} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

export default function DesktopUserMenu({
  avatarUrl,
  displayName,
  loading = false,
  roleLabel,
  showFavorites,
}: DesktopUserMenuProps) {
  const { logoutApp } = useInvestApp();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const safeName = displayName || 'InvestApp user';
  const canShowFavorites = showFavorites ?? /invers|investor/i.test(roleLabel);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const accountItems: MenuItem[] = [
    {
      href: '/profile/personal-data',
      icon: <IconPersonalData />,
      label: 'Personal Data',
      subtitle: 'Identity and contact details',
    },
    {
      href: '/profile/social-media',
      icon: <IconSocialMedia />,
      label: 'Social Media',
      subtitle: 'Public trust signals',
    },
    {
      href: '/profile/referral-code',
      icon: <IconReferralCode />,
      label: 'Referral Code',
      subtitle: 'Invite friends and earn rewards',
    },
  ];
  const transactionItems: MenuItem[] = [
    {
      href: '/profile/bank-account',
      icon: <IconBankAccount />,
      label: 'Bank Account',
      subtitle: 'Payout information',
    },
    ...(canShowFavorites
      ? [
          {
            href: '/profile/favorites',
            icon: <IconFavorites />,
            label: 'Favorites',
            subtitle: 'Saved ventures and founders',
          },
        ]
      : []),
  ];
  const preferenceItems: MenuItem[] = [
    {
      href: '/profile/settings',
      icon: <IconSettings />,
      label: 'Settings',
      subtitle: 'App preferences',
    },
    {
      href: '/profile/language',
      icon: <IconLanguage />,
      label: 'Language',
      subtitle: 'English (US)',
    },
    {
      href: '/profile/help-center',
      icon: <IconHelpCenter />,
      label: 'Help Center',
      subtitle: 'Support workspace',
    },
    {
      href: '/profile/faq',
      icon: <IconFaq />,
      label: 'FAQ',
      subtitle: 'Common questions',
    },
    {
      href: '/profile/privacy-policy',
      icon: <IconPrivacyPolicy />,
      label: 'Privacy Policy',
      subtitle: 'Data and wallet handling',
    },
    {
      href: '/profile/terms-conditions',
      icon: <IconTerms />,
      label: 'Terms & Conditions',
      subtitle: 'Platform responsibilities',
    },
    {
      href: '/profile/about',
      icon: <IconAboutApp />,
      label: 'About App',
      subtitle: 'InvestApp mission',
    },
    {
      icon: <IconLogout />,
      label: 'Log out',
      subtitle: 'Sign out securely',
      danger: true,
      onClick: () => {
        setOpen(false);
        void logoutApp();
      },
    },
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`flex min-w-[190px] items-center gap-3 rounded-2xl border border-transparent px-2 py-1.5 text-left transition duration-200 hover:border-[#E7EAF3] hover:bg-white hover:shadow-[0_14px_32px_rgba(21,28,44,0.06)] focus:outline-none focus:ring-4 focus:ring-[#6B39F4]/10 ${
          open ? 'border-[#D9CCFF] bg-white shadow-[0_16px_36px_rgba(21,28,44,0.08)]' : ''
        }`}
      >
        <span
          className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#EEF2FF] bg-cover bg-center text-sm font-bold text-[#6B39F4] ring-2 ring-white shadow-[0_12px_28px_rgba(21,28,44,0.10)]"
          style={{ backgroundImage: avatarUrl ? `url(${JSON.stringify(avatarUrl)})` : undefined }}
        >
          {avatarUrl ? null : loading ? (
            <span className="h-full w-full animate-pulse bg-[#ECE7FF]" />
          ) : (
            initialsFrom(safeName)
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-[#111827]">{safeName}</span>
          <span className="block truncate text-xs font-medium text-[#73809A]">{roleLabel}</span>
        </span>
        <MenuChevron open={open} />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+14px)] z-50 max-h-[calc(100vh-120px)] w-[440px] overflow-y-auto rounded-[28px] border border-[#E7EAF3] bg-white/[0.96] p-3 shadow-[0_30px_90px_rgba(21,28,44,0.16)] ring-1 ring-white/80 backdrop-blur-2xl"
        >
          <div className="rounded-[22px] bg-[linear-gradient(135deg,#FFFFFF_0%,#F4F0FF_100%)] p-4 ring-1 ring-[#EEE8FF]">
            <div className="flex items-center gap-3">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#EEF2FF] bg-cover bg-center text-sm font-bold text-[#6B39F4] ring-2 ring-white shadow-[0_12px_28px_rgba(21,28,44,0.10)]"
                style={{ backgroundImage: avatarUrl ? `url(${JSON.stringify(avatarUrl)})` : undefined }}
              >
                {avatarUrl ? null : loading ? (
                  <span className="h-full w-full animate-pulse bg-[#ECE7FF]" />
                ) : (
                  initialsFrom(safeName)
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold tracking-[-0.035em] text-[#111827]">{safeName}</p>
                <p className="mt-0.5 text-xs font-semibold text-[#73809A]">{roleLabel}</p>
              </div>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#D9CCFF] bg-white px-3 py-2 text-xs font-bold text-[#6B39F4] shadow-[0_12px_24px_rgba(107,57,244,0.08)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#F8F5FF] focus:outline-none focus:ring-4 focus:ring-[#6B39F4]/10"
              >
                Profile
              </Link>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <MenuSection items={accountItems} onSelect={() => setOpen(false)} title="Account" />
            <MenuSection items={transactionItems} onSelect={() => setOpen(false)} title="Transactions" />
          </div>
          <div className="mt-3">
            <MenuSection items={preferenceItems} onSelect={() => setOpen(false)} title="Preferences" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
