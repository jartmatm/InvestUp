'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { DesktopSidebarIcon } from '@/components/DesktopSidebarIcon';
import { useInvestApp } from '@/lib/investapp-context';
import { useUserProfileSummary } from '@/lib/use-user-profile-summary';

type DesktopAppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  rightRail?: ReactNode;
  contentClassName?: string;
  maxWidthClassName?: string;
  searchPlaceholder?: string;
};

type DesktopMetricCardProps = {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'purple' | 'green' | 'amber' | 'blue' | 'rose' | 'dark';
};

type DesktopSectionCardProps = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

type DesktopListRowProps = {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  href?: string;
  onClick?: () => void;
};

const mainItems = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/portfolio', label: 'Portfolio', icon: 'portfolio' },
  { href: '/invest', label: 'Send', icon: 'send' },
  { href: '/feed', label: 'Feed', icon: 'feed' },
  { href: '/profile', label: 'Profile', icon: 'profile' },
];

const utilityItems = [
  { href: '/home?topup=1', label: 'Top up', icon: 'topup' },
  { href: '/withdraw', label: 'Withdraw', icon: 'withdraw' },
  { href: '/contracts', label: 'Documents', icon: 'documents' },
];

const toneClasses = {
  purple: 'bg-[#F1ECFF] text-[#6B39F4]',
  green: 'bg-[#E7FBF4] text-[#0B9B72]',
  amber: 'bg-[#FFF7E8] text-[#B76E00]',
  blue: 'bg-[#EEF4FF] text-[#4C6EF5]',
  rose: 'bg-[#FFF1F3] text-[#C73A57]',
  dark: 'bg-[#111827] text-white',
} as const;

function getInitials(value: string) {
  return (
    value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U'
  );
}

function getActiveHref(pathname: string) {
  if (pathname.startsWith('/profile')) return '/profile';
  if (pathname.startsWith('/portfolio') || pathname.startsWith('/contracts')) return '/portfolio';
  if (pathname.startsWith('/feed') || pathname.startsWith('/publish')) return '/feed';
  if (
    pathname.startsWith('/invest') ||
    pathname.startsWith('/withdraw') ||
    pathname.startsWith('/history')
  ) {
    return '/invest';
  }
  return '/home';
}

function InvestAppLogo() {
  return (
    <div className="flex items-center gap-0.5 text-[1.55rem] font-semibold tracking-[-0.07em] text-[#111827]">
      <span>Invest</span>
      <span className="text-[#6B39F4]">App</span>
      <span className="ml-0.5 mt-0.5 h-2.5 w-2.5 rounded-full bg-[#6B39F4]" />
    </div>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6.5 9.5a5.5 5.5 0 1 1 11 0c0 5.2 2 6.5 2 6.5h-15s2-1.3 2-6.5" />
      <path d="M10 18.5a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

function IconCrown() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 9 3.2 8h7.6L19 9l-4.2 3.1L12 6 9.2 12.1 5 9Z" />
      <path d="M8 20h8" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function DesktopAppShell({
  title,
  subtitle,
  children,
  eyebrow,
  actions,
  rightRail,
  contentClassName = '',
  maxWidthClassName = 'max-w-[1500px]',
  searchPlaceholder = 'Buscar emprendimientos, emprendedores o palabras clave...',
}: DesktopAppShellProps) {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname);
  const { rolSeleccionado } = useInvestApp();
  const { avatarUrl, displayName, loading } = useUserProfileSummary();
  const safeName = displayName || 'InvestApp user';
  const roleLabel = rolSeleccionado === 'emprendedor' ? 'Emprendedor' : 'Inversionista';

  return (
    <div className="investapp-desktop-autofit hidden min-h-screen bg-[#F8F9FB] text-[#101828] lg:block">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-[#E7EAF3] bg-white/94 px-5 py-6 shadow-[12px_0_50px_rgba(21,28,44,0.04)] backdrop-blur-xl">
        <InvestAppLogo />

        <nav className="mt-9 space-y-1.5">
          {mainItems.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition duration-200 ${
                  active
                    ? 'bg-[#F1ECFF] text-[#6B39F4] shadow-[0_12px_28px_rgba(107,57,244,0.10)]'
                    : 'text-[#64708A] hover:bg-[#F7F8FB] hover:text-[#1F2A44]'
                }`}
              >
                <DesktopSidebarIcon type={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-7 border-t border-[#EEF1F7] pt-6">
          <p className="px-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#98A1B5]">
            {roleLabel}
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
            <IconCrown />
          </span>
          <p className="mt-4 text-base font-bold text-[#6B39F4]">Hazte Premium</p>
          <p className="mt-2 text-sm leading-5 text-[#74809A]">
            Mas visibilidad, mejores analiticas y prioridad en tu experiencia.
          </p>
          <Link
            href="/profile"
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#7C5CFF_0%,#5B2FF4_100%)] text-sm font-bold text-white shadow-[0_16px_30px_rgba(107,57,244,0.24)] transition duration-200 hover:-translate-y-0.5"
          >
            Ver planes
          </Link>
        </div>
      </aside>

      <div className="min-w-0 pl-[260px]">
        <header className="sticky top-0 z-20 flex h-[80px] items-center gap-8 border-b border-[#E7EAF3] bg-white/86 px-8 backdrop-blur-xl">
          <label className="relative block w-full max-w-[720px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA4B7]">
              <IconSearch />
            </span>
            <input
              placeholder={searchPlaceholder}
              className="h-12 w-full rounded-2xl border border-[#DDE2EE] bg-white pl-12 pr-4 text-sm font-medium text-[#182033] outline-none shadow-[0_12px_28px_rgba(21,28,44,0.04)] transition placeholder:text-[#9BA5B8] focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10"
            />
          </label>

          <div className="ml-auto flex min-w-[390px] items-center justify-end gap-5">
            {actions}
            <Link
              href="/notifications"
              className="relative grid h-11 w-11 place-items-center rounded-2xl border border-[#E7EAF3] bg-white text-[#1F2A44] shadow-[0_12px_28px_rgba(21,28,44,0.05)] transition duration-200 hover:-translate-y-0.5 hover:text-[#6B39F4]"
              aria-label="Notifications"
            >
              <IconBell />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#6B39F4]" />
            </Link>

            <div className="h-9 w-px bg-[#E7EAF3]" />

            <Link href="/profile" className="flex min-w-[190px] items-center gap-3">
              <span
                className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-[#EEF2FF] bg-cover bg-center text-sm font-bold text-[#6B39F4] ring-2 ring-white shadow-[0_12px_28px_rgba(21,28,44,0.10)]"
                style={{ backgroundImage: avatarUrl ? `url(${JSON.stringify(avatarUrl)})` : undefined }}
              >
                {avatarUrl ? null : loading ? (
                  <span className="h-full w-full animate-pulse bg-[#ECE7FF]" />
                ) : (
                  getInitials(safeName)
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-[#111827]">{safeName}</span>
                <span className="block text-xs font-medium text-[#73809A]">{roleLabel}</span>
              </span>
              <span className="rotate-90 text-[#73809A]">
                <IconChevron />
              </span>
            </Link>
          </div>
        </header>

        <main className="px-8 py-7 xl:px-10">
          <div className={`mx-auto w-full ${maxWidthClassName} ${contentClassName}`}>
            <div className="mb-6 flex items-start justify-between gap-6">
              <div>
                {eyebrow ? (
                  <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#8A95A8]">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className="text-[2.25rem] font-bold leading-tight tracking-[-0.06em] text-[#111827]">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-1.5 max-w-2xl text-base font-medium text-[#66728A]">{subtitle}</p>
                ) : null}
              </div>
            </div>

            {rightRail ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-6">{children}</div>
                <aside className="space-y-6">{rightRail}</aside>
              </div>
            ) : (
              <div className="space-y-6">{children}</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export function DesktopSectionCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: DesktopSectionCardProps) {
  return (
    <section className={`rounded-[24px] border border-[#E9ECF4] bg-white p-6 shadow-[0_18px_42px_rgba(21,28,44,0.055)] ${className}`}>
      {title || subtitle || action ? (
        <div className="mb-5 flex items-start justify-between gap-5">
          <div>
            {title ? (
              <h2 className="text-xl font-bold tracking-[-0.045em] text-[#111827]">{title}</h2>
            ) : null}
            {subtitle ? <p className="mt-1 text-sm font-medium text-[#66728A]">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function DesktopMetricCard({
  icon,
  label,
  value,
  detail,
  tone = 'purple',
}: DesktopMetricCardProps) {
  return (
    <article className="group flex min-h-[126px] items-center gap-5 rounded-[22px] border border-[#E8EBF4] bg-white p-5 shadow-[0_18px_42px_rgba(21,28,44,0.055)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_58px_rgba(21,28,44,0.08)]">
      {icon ? (
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${toneClasses[tone]}`}>
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[0.74rem] font-bold uppercase tracking-[0.16em] text-[#8A95A8]">
          {label}
        </span>
        <span className="mt-2 block text-[1.45rem] font-bold leading-tight tracking-[-0.045em] text-[#111827]">
          {value}
        </span>
        {detail ? <span className="mt-1 block text-sm font-medium text-[#73809A]">{detail}</span> : null}
      </span>
    </article>
  );
}

export function DesktopListRow({ icon, title, subtitle, meta, href, onClick }: DesktopListRowProps) {
  const content = (
    <>
      {icon ? (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F1ECFF] text-[#6B39F4]">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[#111827]">{title}</span>
        {subtitle ? <span className="mt-1 block truncate text-xs font-medium text-[#73809A]">{subtitle}</span> : null}
      </span>
      {meta ? <span className="shrink-0 text-sm font-semibold text-[#59657D]">{meta}</span> : null}
      <span className="text-[#A2ABBD]">
        <IconChevron />
      </span>
    </>
  );

  const className =
    'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition duration-200 hover:bg-[#F8F9FB]';

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export function DesktopEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#CFC3FF] bg-[#FBFAFF] p-10 text-center">
      <p className="text-lg font-bold tracking-[-0.04em] text-[#111827]">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-[#66728A]">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
