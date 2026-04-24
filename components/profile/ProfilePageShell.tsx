'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

type ProfilePageShellProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
};

type ProfileSurfaceProps = {
  children: ReactNode;
  className?: string;
};

type ProfileFieldShellProps = {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  helper?: ReactNode;
};

type ProfileNoticeTone = 'neutral' | 'success' | 'warning' | 'danger';

type ProfileNoticeProps = {
  children: ReactNode;
  tone?: ProfileNoticeTone;
  className?: string;
};

type ProfilePrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
};

type ProfileInfoTileTone = 'purple' | 'blue' | 'green' | 'amber' | 'rose';

type ProfileInfoTileProps = {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  tone?: ProfileInfoTileTone;
  className?: string;
};

export const profileControlClassName =
  'w-full bg-transparent text-[0.98rem] font-medium tracking-[-0.025em] text-[#162033] outline-none placeholder:text-[#9BA5B9] disabled:text-[#9BA5B9]';

const toneClassMap: Record<ProfileInfoTileTone, string> = {
  purple: 'bg-[#F5F1FF] text-[#6B39F4]',
  blue: 'bg-[#EEF4FF] text-[#4C6EF5]',
  green: 'bg-[#EEF9F2] text-[#14845A]',
  amber: 'bg-[#FFF7E8] text-[#C77C00]',
  rose: 'bg-[#FFF1F3] text-[#C73A57]',
};

const noticeToneClassMap: Record<ProfileNoticeTone, string> = {
  neutral: 'border-[#E4D9FF] bg-[#F6F1FF] text-[#6B39F4]',
  success: 'border-[#BEE8D2] bg-[#EEF9F2] text-[#177B58]',
  warning: 'border-[#FFDB93] bg-[#FFF8EA] text-[#9C6900]',
  danger: 'border-[#F4C3CB] bg-[#FFF3F5] text-[#B93852]',
};

function IconBack() {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ProfilePageShell({
  title,
  subtitle,
  backHref = '/profile',
  backLabel = 'Back',
  children,
  footer,
  contentClassName = '',
}: ProfilePageShellProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(backHref);
  };

  return (
    <>
      <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.14),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_52%,#F8F9FD_100%)] pb-[13.5rem] text-[#101828]">
        <div className="pointer-events-none absolute left-1/2 top-[-9rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-28 top-72 h-64 w-64 rounded-full bg-[#B9A8FF]/14 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 top-56 h-64 w-64 rounded-full bg-[#B9A8FF]/16 blur-3xl" />

        <div className={`relative mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-8 pt-8 ${contentClassName}`}>
          <header className="flex flex-col gap-4">
            <button
              type="button"
              onClick={handleBack}
              aria-label={backLabel}
              className="flex min-h-[44px] w-11 items-center justify-center rounded-full border border-white/90 bg-white/88 text-[#1C2336] shadow-[0_16px_34px_rgba(31,38,64,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white"
            >
              <IconBack />
            </button>

            <div className="flex flex-col gap-1">
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#8A93A8]">
                InvestApp
              </span>
              <h1 className="text-[2rem] font-semibold tracking-[-0.065em] text-[#1C2336]">
                {title}
              </h1>
              {subtitle ? (
                <p className="max-w-[28rem] text-sm leading-6 text-[#7B879C]">{subtitle}</p>
              ) : null}
            </div>
          </header>

          {children}
        </div>
      </main>

      {footer ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[5.75rem] z-20">
          <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-3 px-4">
            {footer}
          </div>
        </div>
      ) : null}

      <BottomNav />
    </>
  );
}

export function ProfileSurface({ children, className = '' }: ProfileSurfaceProps) {
  return (
    <section
      className={`rounded-[30px] border border-white/85 bg-white/88 p-4 shadow-[0_24px_70px_rgba(31,38,64,0.10)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl ${className}`}
    >
      {children}
    </section>
  );
}

export function ProfileFieldShell({ label, icon, children, helper }: ProfileFieldShellProps) {
  return (
    <label className="flex flex-col gap-2.5">
      <span className="px-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#7B879C]">
        {label}
      </span>
      <div className="flex items-center gap-3 rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-3.5 py-3 shadow-[0_16px_32px_rgba(31,38,64,0.05)] transition focus-within:border-[#D7C8FF] focus-within:ring-4 focus-within:ring-[#6B39F4]/10">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F1FF] text-[#6B39F4] shadow-[0_10px_20px_rgba(107,57,244,0.10)]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {helper ? <span className="px-1 text-xs leading-5 text-[#7B879C]">{helper}</span> : null}
    </label>
  );
}

export function ProfileNotice({
  children,
  tone = 'neutral',
  className = '',
}: ProfileNoticeProps) {
  return (
    <div
      className={`rounded-[22px] border px-4 py-3 text-sm leading-6 shadow-[0_16px_34px_rgba(31,38,64,0.08)] backdrop-blur-xl ${noticeToneClassMap[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

export function ProfilePrimaryButton({
  children,
  className = '',
  type = 'button',
  ...props
}: ProfilePrimaryButtonProps) {
  return (
    <button
      type={type}
      className={`flex min-h-[56px] w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] px-5 text-base font-semibold tracking-[-0.02em] text-white shadow-[0_22px_38px_rgba(107,57,244,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ProfileInfoTile({
  icon,
  eyebrow,
  title,
  description,
  tone = 'purple',
  className = '',
}: ProfileInfoTileProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/82 px-4 py-4 shadow-[0_16px_32px_rgba(31,38,64,0.06)] ${className}`}
    >
      {icon ? (
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-[0_10px_20px_rgba(107,57,244,0.08)] ${toneClassMap[tone]}`}
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8A93A8]">
            {eyebrow}
          </p>
        ) : null}
        <p className="mt-1 text-sm font-semibold text-[#1C2336]">{title}</p>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-[#7B879C]">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
