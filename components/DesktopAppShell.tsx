'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import DesktopSidebar from '@/components/DesktopSidebar';
import DesktopTopbar from '@/components/DesktopTopbar';
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
  hideHeader?: boolean;
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

const toneClasses = {
  purple: 'bg-[#F1ECFF] text-[#6B39F4]',
  green: 'bg-[#E7FBF4] text-[#0B9B72]',
  amber: 'bg-[#FFF7E8] text-[#B76E00]',
  blue: 'bg-[#EEF4FF] text-[#4C6EF5]',
  rose: 'bg-[#FFF1F3] text-[#C73A57]',
  dark: 'bg-[#111827] text-white',
} as const;

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
  maxWidthClassName = 'max-w-none',
  searchPlaceholder = 'Search ventures, entrepreneurs or keywords...',
  hideHeader = false,
}: DesktopAppShellProps) {
  const { rolSeleccionado } = useInvestApp();
  const { avatarUrl, displayName, loading } = useUserProfileSummary();
  const safeName = displayName || 'InvestApp user';
  const roleLabel = rolSeleccionado === 'emprendedor' ? 'Entrepreneur' : 'Investor';

  return (
    <div className="investapp-desktop-autofit hidden min-h-screen bg-[#F8F9FB] text-[#101828] lg:block">
      <DesktopSidebar roleLabel={roleLabel} />

      <div className="min-w-0 pl-[260px]">
        <DesktopTopbar
          actions={actions}
          avatarUrl={avatarUrl}
          displayName={safeName}
          loading={loading}
          roleLabel={roleLabel}
          searchPlaceholder={searchPlaceholder}
        />

        <main className="px-5 py-5 xl:px-7 2xl:px-9">
          <div className={`mx-auto w-full ${maxWidthClassName} ${contentClassName}`}>
            {hideHeader ? null : (
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
            )}

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
