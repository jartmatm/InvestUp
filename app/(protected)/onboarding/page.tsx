'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useInvestApp } from '@/lib/investapp-context';

type OnboardingStage = 'slides' | 'profile';
type SlideId = 'wallet' | 'withdraw' | 'marketplace' | 'dashboard';

type SlideDefinition = {
  id: SlideId;
  eyebrow: string;
  title: string;
  description: string;
};

const ONBOARDING_SLIDES: SlideDefinition[] = [
  {
    id: 'wallet',
    eyebrow: 'Wallet overview',
    title: 'Control every balance with clarity.',
    description:
      'See available funds, live returns and quick actions in one polished financial home.',
  },
  {
    id: 'withdraw',
    eyebrow: 'Safe transfers',
    title: 'Move funds with trust built in.',
    description:
      'Withdrawals, compliance and payout steps stay simple, verified and easy to follow.',
  },
  {
    id: 'marketplace',
    eyebrow: 'Curated ventures',
    title: 'Discover ventures worth your attention.',
    description:
      'Browse high-signal opportunities with elegant filters, strong rates and clear focus.',
  },
  {
    id: 'dashboard',
    eyebrow: 'Founder insights',
    title: 'Publish and monitor your venture beautifully.',
    description:
      'Track funding progress, repayments and performance with a premium dashboard experience.',
  },
] as const;

const SWIPE_THRESHOLD = 48;
const SURFACE_CLASSNAME =
  'rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,247,255,0.92)_100%)] shadow-[0_24px_70px_rgba(28,35,54,0.10)] backdrop-blur-2xl';

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function mixColor(from: [number, number, number], to: [number, number, number], ratio: number) {
  const clamped = Math.max(0, Math.min(1, ratio));
  return from.map((value, index) =>
    Math.round(value + (to[index] - value) * clamped)
  ) as [number, number, number];
}

function rgbToString([r, g, b]: [number, number, number]) {
  return `rgb(${r}, ${g}, ${b})`;
}

function getGaugeColors(progress: number) {
  if (progress <= 30) {
    const tone = mixColor([248, 113, 113], [245, 158, 11], progress / 30);
    const accent = mixColor([239, 68, 68], [251, 191, 36], progress / 30);
    return [rgbToString(tone), rgbToString(accent)] as const;
  }

  if (progress <= 70) {
    const ratio = (progress - 30) / 40;
    const tone = mixColor([245, 158, 11], [74, 222, 128], ratio);
    const accent = mixColor([251, 191, 36], [22, 163, 74], ratio);
    return [rgbToString(tone), rgbToString(accent)] as const;
  }

  const ratio = (progress - 70) / 30;
  const tone = mixColor([74, 222, 128], [16, 185, 129], ratio);
  const accent = mixColor([22, 163, 74], [5, 150, 105], ratio);
  return [rgbToString(tone), rgbToString(accent)] as const;
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

function IconArrowLeft() {
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
      <path d="M15 18L9 12L15 6" />
    </svg>
  );
}

function IconArrowRight() {
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
      <path d="M9 18L15 12L9 6" />
    </svg>
  );
}

function IconSearch() {
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
      <path d="M16.6569 16.6569C19.781 13.5327 19.781 8.46734 16.6569 5.34315C13.5327 2.21895 8.46734 2.21895 5.34315 5.34315C2.21895 8.46734 2.21895 13.5327 5.34315 16.6569C8.46734 19.781 13.5327 19.781 16.6569 16.6569ZM16.6569 16.6569L21 21" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M10 2H14M10 21.2361C10.5308 21.7111 11.2316 22 12 22C12.7684 22 13.4692 21.7111 14 21.2361M5.08493 18.5C4.27945 18.5 3.75557 17.7407 4.11579 17.0954L5.43842 14.7258C6.19069 13.3781 6.58234 11.892 6.58234 10.3852V9.76471C6.58234 8.11791 7.49804 6.6627 8.89823 5.78534C8.96478 5.74364 9.03243 5.70324 9.10113 5.6642C9.93938 5.1877 10.9337 4.91176 12 4.91176C13.0663 4.91176 14.0606 5.1877 14.8989 5.6642C14.9676 5.70324 15.0352 5.74364 15.1018 5.78534C16.502 6.6627 17.4177 8.11791 17.4177 9.76471V10.3852C17.4177 11.892 17.8093 13.3781 18.5616 14.7258L19.8842 17.0954C20.2444 17.7407 19.7205 18.5 18.9151 18.5H15H9H5.08493Z" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.58103 11.2216C7.40814 8.30868 9.77448 7 12 7C14.2255 7 16.5919 8.30868 18.419 11.2216C18.7169 11.6966 18.7169 12.3034 18.419 12.7784C16.5919 15.6913 14.2255 17 12 17C9.77448 17 7.40814 15.6913 5.58103 12.7784C5.28309 12.3034 5.28309 11.6966 5.58103 11.2216ZM20.1132 10.1588C18.0178 6.81811 15.0793 5 12 5C8.92069 5 5.98221 6.81811 3.88675 10.1588C3.18118 11.2837 3.18118 12.7163 3.88675 13.8412C5.98221 17.1819 8.92069 19 12 19C15.0793 19 18.0178 17.1819 20.1132 13.8412C20.8188 12.7163 20.8188 11.2837 20.1132 10.1588ZM11.9153 10.0018C11.9434 10.0006 11.9716 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 11.9716 10.0006 11.9434 10.0018 11.9153C10.1577 11.9701 10.3253 12 10.5 12C11.3284 12 12 11.3284 12 10.5C12 10.3253 11.9701 10.1577 11.9153 10.0018ZM12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8Z"
        fill="currentColor"
      />
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
      <path d="M4 7.5C4 5.84315 5.34315 4.5 7 4.5H16.5C18.1569 4.5 19.5 5.84315 19.5 7.5V8.5H17C15.6193 8.5 14.5 9.61929 14.5 11V13C14.5 14.3807 15.6193 15.5 17 15.5H19.5V16.5C19.5 18.1569 18.1569 19.5 16.5 19.5H7C5.34315 19.5 4 18.1569 4 16.5V7.5Z" />
      <path d="M19.5 9.5H17C16.1716 9.5 15.5 10.1716 15.5 11V13C15.5 13.8284 16.1716 14.5 17 14.5H19.5V9.5Z" />
      <circle cx="17.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconSend() {
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
      <path d="M21 12V10M13 19H6.29198H5C3.89543 19 3 18.1046 3 17V10M21 10V7C21 5.89543 20.1046 5 19 5H17.708H6.29198H5C3.89543 5 3 5.89543 3 7V10M21 10H3M16 17H21M21 17L19 15M21 17L19 19" />
    </svg>
  );
}

function IconDownload() {
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
      <path d="M12 6V14M12 14L14.5 11.5M12 14L9.5 11.5M15.5 8H17C18.6569 8 20 9.34315 20 11V15C20 16.6569 18.6569 18 17 18H7C5.34315 18 4 16.6569 4 15V11C4 9.34315 5.34315 8 7 8H8.5" />
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7V12L15.5 14" />
    </svg>
  );
}

function IconShield() {
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
      <path d="M12 3L19 6V11C19 15.4183 16.2132 19.3359 12 20.75C7.7868 19.3359 5 15.4183 5 11V6L12 3Z" />
      <path d="M9 12L11 14L15 10" />
    </svg>
  );
}

function IconBank() {
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
      <path d="M3 9.5L12 4L21 9.5" />
      <path d="M4.5 10.5H19.5" />
      <path d="M6.5 10.5V17.5" />
      <path d="M10.5 10.5V17.5" />
      <path d="M14.5 10.5V17.5" />
      <path d="M18.5 10.5V17.5" />
      <path d="M3.5 19.5H20.5" />
    </svg>
  );
}

function IconFilter() {
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
      <path d="M4 6H20" />
      <path d="M7 12H17" />
      <path d="M10 18H14" />
    </svg>
  );
}

function IconSort() {
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
      <path d="M7 6H17" />
      <path d="M7 12H14" />
      <path d="M7 18H11" />
      <path d="M18 16L20 18L22 16" />
      <path d="M20 6V18" />
    </svg>
  );
}

function IconHeart({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21S5.25 16.5 3.5 11.7C2.34 8.52 4.17 5.4 7.3 4.64C9.46 4.11 11.17 4.95 12 6.06C12.83 4.95 14.54 4.11 16.7 4.64C19.83 5.4 21.66 8.52 20.5 11.7C18.75 16.5 12 21 12 21Z" />
    </svg>
  );
}

function IconSpark() {
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
      <path d="M12 3L13.85 8.15L19 10L13.85 11.85L12 17L10.15 11.85L5 10L10.15 8.15L12 3Z" />
    </svg>
  );
}

function IconTrendUp() {
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
      <path d="M4 15L9 10L13 14L20 7" />
      <path d="M15 7H20V12" />
    </svg>
  );
}

function IconUsers() {
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
      <path d="M16 21V19C16 17.3431 14.6569 16 13 16H7C5.34315 16 4 17.3431 4 19V21" />
      <circle cx="10" cy="9" r="3" />
      <path d="M20 21V19C19.9994 17.6262 19.0551 16.4322 17.72 16.1162" />
      <path d="M15 6.13C16.336 6.46273 17.2742 7.6612 17.2742 9.04C17.2742 10.4188 16.336 11.6173 15 11.95" />
    </svg>
  );
}

function InvestAppWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-0.5 font-semibold tracking-[-0.07em] text-[#1C2336]',
        compact ? 'text-[1.35rem]' : 'text-[1.65rem]'
      )}
    >
      <span>Invest</span>
      <span className="text-[#6B39F4]">App</span>
      <span className="ml-0.5 mt-0.5 h-2.5 w-2.5 rounded-full bg-[#6B39F4]" />
    </div>
  );
}

function FloatingBadge({
  children,
  tone = 'violet',
  className,
}: {
  children: ReactNode;
  tone?: 'violet' | 'emerald' | 'amber' | 'slate';
  className?: string;
}) {
  const tones = {
    violet:
      'border-[#D9CCFF] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(245,239,255,0.92)_100%)] text-[#6B39F4]',
    emerald:
      'border-emerald-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(236,253,245,0.92)_100%)] text-emerald-600',
    amber:
      'border-amber-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(255,247,237,0.92)_100%)] text-amber-600',
    slate:
      'border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.92)_100%)] text-slate-500',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.06)]',
        tones[tone],
        className
      )}
    >
      {children}
    </div>
  );
}

function MockIconTile({
  icon,
  label,
  className,
  active = false,
}: {
  icon: ReactNode;
  label: string;
  className?: string;
  active?: boolean;
}) {
  return (
    <motion.div
      animate={
        active
          ? {
              scale: [1, 1.08, 1],
              y: [0, -3, 0],
            }
          : {
              scale: 1,
              y: 0,
            }
      }
      transition={{
        duration: active ? 0.72 : 0.24,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-[18px] bg-white/78 px-2 py-2.5 transform-gpu',
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E2FF] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(245,239,255,0.94)_100%)] text-[#6B39F4] shadow-[0_10px_22px_rgba(107,57,244,0.12)]">
        {icon}
      </div>
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
    </motion.div>
  );
}

function MockField({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-white/80 bg-white/78 px-3 py-3 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3EFFF] text-[#6B39F4]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
        <p className="truncate text-[12px] font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function MockProjectCard({
  title,
  rate,
  palette,
  flipped = false,
}: {
  title: string;
  rate: string;
  palette: 'amber' | 'violet' | 'emerald' | 'blue';
  flipped?: boolean;
}) {
  const palettes = {
    amber:
      'from-[#9A3412] via-[#F59E0B] to-[#FDE68A] after:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_45%)]',
    violet:
      'from-[#312E81] via-[#6D28D9] to-[#C4B5FD] after:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_45%)]',
    emerald:
      'from-[#064E3B] via-[#10B981] to-[#A7F3D0] after:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_45%)]',
    blue:
      'from-[#1E3A8A] via-[#2563EB] to-[#93C5FD] after:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_45%)]',
  };

  return (
    <div className="relative h-[172px] [perspective:1200px]">
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
        className="relative h-full w-full transform-gpu"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className="absolute inset-0 rounded-[20px] border border-white/80 bg-white/80 p-2.5 shadow-[0_16px_30px_rgba(15,23,42,0.07)]"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div
            className={cn(
              'relative h-24 overflow-hidden rounded-[16px] bg-gradient-to-br after:absolute after:inset-0',
              palettes[palette]
            )}
          >
            <div className="absolute left-3 top-3 h-6 w-14 rounded-full bg-white/14 blur-sm" />
            <div className="absolute -bottom-5 right-2 h-16 w-16 rounded-full bg-white/18 blur-2xl" />
            <div className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur-md">
              <IconHeart />
            </div>
            <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/18 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
              <IconTrendUp />
              {rate}
            </div>
          </div>
          <div className="mt-2.5">
            <p className="line-clamp-2 text-[12px] font-semibold leading-4 text-slate-800">{title}</p>
          </div>
        </div>

        <div
          className="absolute inset-0 rounded-[20px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(246,244,255,0.88)_100%)] p-3 shadow-[0_16px_30px_rgba(15,23,42,0.07)]"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div
            className={cn(
              'relative flex h-full flex-col justify-between overflow-hidden rounded-[16px] bg-gradient-to-br p-3 text-white',
              palette === 'amber'
                ? 'from-[#6B3A12] via-[#C2410C] to-[#FDBA74]'
                : palette === 'violet'
                  ? 'from-[#312E81] via-[#5B21B6] to-[#A78BFA]'
                  : palette === 'emerald'
                    ? 'from-[#065F46] via-[#059669] to-[#6EE7B7]'
                    : 'from-[#1D4ED8] via-[#2563EB] to-[#93C5FD]'
            )}
          >
            <div className="absolute -right-5 -top-4 h-20 w-20 rounded-full bg-white/16 blur-2xl" />
            <div className="flex items-center justify-between">
              <FloatingBadge tone="emerald" className="border-0 bg-white/16 text-white">
                Live
              </FloatingBadge>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/68">{rate}</p>
            </div>
            <div>
              <p className="line-clamp-2 text-[13px] font-semibold leading-5">{title}</p>
              <p className="mt-2 text-[11px] leading-4 text-white/72">
                Funding window open with curated venture metrics and clear repayment terms.
              </p>
            </div>
            <div className="flex items-center justify-between text-[10px] text-white/72">
              <span>Polygon</span>
              <span>Verified</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function WithdrawalMethodCard({
  icon,
  title,
  subtitle,
  selected,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  selected: boolean;
}) {
  return (
    <motion.div
      animate={{
        scale: selected ? [1, 1.035, 1.02] : 1,
        y: selected ? -2 : 0,
      }}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        'rounded-[22px] p-3 shadow-[0_12px_24px_rgba(15,23,42,0.05)]',
        selected
          ? 'bg-[linear-gradient(135deg,#5B21B6_0%,#6B39F4_55%,#2E90FA_100%)] text-white shadow-[0_16px_34px_rgba(107,57,244,0.22)]'
          : 'border border-white/85 bg-white/84 text-slate-600'
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full',
            selected ? 'bg-white/14 text-white' : 'bg-[#F3EFFF] text-[#6B39F4]'
          )}
        >
          {icon}
        </div>
        {selected ? (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#6B39F4]">
            <span className="text-[10px] font-bold">✓</span>
          </div>
        ) : null}
      </div>
      <p className={cn('mt-4 text-sm font-semibold', selected ? 'text-white' : 'text-slate-800')}>{title}</p>
      <p className={cn('mt-1 text-[11px]', selected ? 'text-white/72' : 'text-slate-500')}>{subtitle}</p>
    </motion.div>
  );
}

function SceneShell({
  children,
  accentClass,
}: {
  children: ReactNode;
  accentClass: string;
}) {
  return (
    <div
      className={cn(
        'relative min-h-0 flex-1 overflow-hidden rounded-[34px] border border-white/75 p-4 shadow-[0_24px_70px_rgba(28,35,54,0.12)]',
        'bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(246,244,255,0.94)_100%)]'
      )}
    >
      <div className={cn('absolute -left-10 top-12 h-28 w-28 rounded-full blur-3xl', accentClass)} />
      <div className="absolute -right-10 bottom-10 h-32 w-32 rounded-full bg-[#A78BFA]/20 blur-3xl" />
      <div className="absolute inset-x-8 top-0 h-20 rounded-full bg-white/30 blur-3xl" />
      <div className="relative flex h-full flex-col gap-3">{children}</div>
    </div>
  );
}

function FundingGauge({ progress }: { progress: number }) {
  const [startColor, endColor] = getGaugeColors(progress);
  const [displayedProgress, setDisplayedProgress] = useState(0);

  useEffect(() => {
    let frameId = 0;
    let startAt: number | null = null;
    const duration = 1200;

    const tick = (timestamp: number) => {
      if (startAt === null) startAt = timestamp;
      const elapsed = timestamp - startAt;
      const ratio = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);
      setDisplayedProgress(progress * eased);
      if (ratio < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [progress]);

  return (
    <div className="relative">
      <svg viewBox="0 0 224 132" className="w-full">
        <defs>
          <linearGradient id="onboarding-gauge-fill" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={startColor} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
          <filter id="onboarding-gauge-glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M24 112 A88 88 0 0 1 200 112"
          pathLength="100"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="13"
          fill="none"
          strokeLinecap="round"
        />
        <motion.path
          d="M24 112 A88 88 0 0 1 200 112"
          pathLength="100"
          stroke="url(#onboarding-gauge-fill)"
          strokeWidth="13"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="100"
          initial={{ strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: 100 - progress }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          filter="url(#onboarding-gauge-glow)"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/55">Funding progress</p>
        <p className="mt-2 text-[2rem] font-semibold tracking-tight text-white">{displayedProgress.toFixed(0)}%</p>
      </div>
    </div>
  );
}

function WalletScene() {
  const [activeAction, setActiveAction] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveAction((previous) => (previous + 1) % 4);
    }, 760);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <SceneShell accentClass="bg-[#6B39F4]/18">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className={cn(SURFACE_CLASSNAME, 'p-3.5')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-full border border-white/70 shadow-[0_14px_28px_rgba(107,57,244,0.18)]">
              <Image
                src="/onboarding/julia-roberts-onboarding.jpeg"
                alt="Julia Roberts"
                fill
                sizes="44px"
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Hello, investor</p>
              <p className="text-sm font-semibold text-slate-900">Julia Roberts</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/76 text-slate-500 shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
              <IconSearch />
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/76 text-slate-500 shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
              <IconBell />
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-[28px] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_30%),linear-gradient(135deg,#4C1D95_0%,#6B39F4_48%,#2563EB_100%)] p-4 text-white shadow-[0_24px_48px_rgba(88,28,135,0.28)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/68">Available</p>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-[2rem] font-semibold tracking-tight">$731.04</span>
                <span className="pb-1 text-sm font-medium text-white/80">USD</span>
              </div>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/14 text-white backdrop-blur-md">
              <IconEye />
            </div>
          </div>

          <div className="mt-4 rounded-full border border-white/15 bg-white/14 px-3 py-2 text-[10px] font-semibold text-white/88 backdrop-blur-md">
            Active: 17 • Avg rate: 18.3% • Earnings: $5.200
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2.5">
          <MockIconTile icon={<IconWallet />} label="Top up" active={activeAction === 0} />
          <MockIconTile icon={<IconSend />} label="Send" active={activeAction === 1} />
          <MockIconTile icon={<IconDownload />} label="Withdraw" active={activeAction === 2} />
          <MockIconTile icon={<IconClock />} label="History" active={activeAction === 3} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.46, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className={cn(SURFACE_CLASSNAME, 'p-3.5')}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Active investments</p>
            <p className="mt-1 text-[11px] text-slate-500">A clearer snapshot of your best-performing venture.</p>
          </div>
          <FloatingBadge tone="emerald">+25.0%</FloatingBadge>
        </div>

        <div className="mt-3 rounded-[24px] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,#1E293B_0%,#0F172A_100%)] p-3 text-white shadow-[0_18px_40px_rgba(15,23,42,0.26)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <FloatingBadge tone="emerald" className="border-0 bg-emerald-300/15 text-emerald-200">
                Up to date
              </FloatingBadge>
              <p className="mt-3 text-base font-semibold">Empanadas Play</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.34em] text-white/45">MANU ALIN VPROJECT</p>
            </div>
            <div className="h-14 w-14 rounded-[18px] bg-[linear-gradient(135deg,#F59E0B_0%,#FDBA74_100%)] shadow-[0_12px_28px_rgba(245,158,11,0.28)]" />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-white/72">
            <span>Jairo Mateus</span>
            <span>03/04/29</span>
            <span className="font-semibold text-white">100.00 USD</span>
          </div>
        </div>
      </motion.div>
    </SceneShell>
  );
}

function WithdrawScene() {
  const [selectedMethod, setSelectedMethod] = useState<'bank' | 'breve'>('bank');

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSelectedMethod((previous) => (previous === 'bank' ? 'breve' : 'bank'));
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <SceneShell accentClass="bg-[#F59E0B]/16">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className={cn(SURFACE_CLASSNAME, 'p-3.5')}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[1.35rem] font-semibold tracking-tight text-slate-900">Withdraw funds</h3>
            <p className="mt-1 text-[12px] text-slate-500">Verified steps keep every payout safer and clearer.</p>
          </div>
        </div>

        <div className="mt-3 rounded-[22px] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.96)_0%,rgba(255,247,237,0.92)_100%)] p-3 text-amber-700 shadow-[0_10px_24px_rgba(245,158,11,0.08)]">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/80">
              <IconShield />
            </div>
            <p className="text-[11px] leading-5">
              Fiat withdrawals are reviewed first. After confirmation, funds are routed safely to your bank.
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          <div className="flex items-center justify-between gap-3 rounded-[20px] border border-white/85 bg-white/82 px-3 py-3 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Available balance</p>
              <p className="mt-1 text-[12px] font-medium text-slate-700">USD ready to withdraw from your wallet.</p>
            </div>
            <div className="flex min-w-[134px] justify-center rounded-full border border-[#D9CCFF] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(245,239,255,0.96)_100%)] px-4 py-2 text-[11px] font-semibold text-[#6B39F4] shadow-[0_10px_24px_rgba(107,57,244,0.08)]">
              $731.04 USD
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <WithdrawalMethodCard
              icon={<IconBank />}
              title="Bank"
              subtitle="Manual bank payout"
              selected={selectedMethod === 'bank'}
            />

            <WithdrawalMethodCard
              icon={<IconSend />}
              title="Breve"
              subtitle="Single key payout"
              selected={selectedMethod === 'breve'}
            />
          </div>

          <div className="grid gap-2">
            <MockField icon={<IconBank />} label="Select bank" value="JPMorgan Chase" />
            <MockField icon={<IconWallet />} label="Account number" value="**** 3307" />
            <MockField icon={<IconDownload />} label="Amount in USDC" value="100.00" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.46, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className={cn(SURFACE_CLASSNAME, 'p-3.5')}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Transaction history</p>
            <p className="mt-1 text-[11px] text-slate-500">Every movement stays readable and easy to verify.</p>
          </div>
          <FloatingBadge tone="amber">Pending</FloatingBadge>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-[22px] border border-white/85 bg-white/84 px-3 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEE2E2] text-rose-500">
              <IconArrowRight />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-slate-800">Investment sent</p>
              <p className="text-[11px] text-slate-500">Investment • Apr 03, 2026 at 02:29 PM</p>
            </div>
          </div>
          <p className="text-[13px] font-semibold text-rose-500">-100.00 USDC</p>
        </div>
      </motion.div>
    </SceneShell>
  );
}

function MarketplaceScene() {
  const [marketplacePhase, setMarketplacePhase] = useState<'scroll' | 'flip' | 'reset'>('scroll');

  useEffect(() => {
    let active = true;
    const timers: number[] = [];

    const runCycle = () => {
      if (!active) return;
      setMarketplacePhase('scroll');
      timers.push(
        window.setTimeout(() => {
          if (active) setMarketplacePhase('flip');
        }, 2000)
      );
      timers.push(
        window.setTimeout(() => {
          if (active) setMarketplacePhase('reset');
        }, 4000)
      );
      timers.push(
        window.setTimeout(() => {
          if (active) runCycle();
        }, 5600)
      );
    };

    runCycle();

    return () => {
      active = false;
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  const marketplaceCards = [
    {
      title: 'Pequeno negocio de empanadas en cuadrra play',
      rate: '16% EA',
      palette: 'amber' as const,
    },
    {
      title: 'Plataforma educativa online para habilidades digitales',
      rate: '18% EA',
      palette: 'violet' as const,
    },
    {
      title: 'Restaurante saludable con ingredientes locales',
      rate: '15% EA',
      palette: 'emerald' as const,
    },
    {
      title: 'Tienda sostenible de moda urbana',
      rate: '17% EA',
      palette: 'blue' as const,
    },
    {
      title: 'Clinica preventiva con tecnologia para barrios emergentes',
      rate: '14% EA',
      palette: 'emerald' as const,
    },
    {
      title: 'Marketplace B2B para suministro de comercios locales',
      rate: '19% EA',
      palette: 'violet' as const,
    },
    {
      title: 'Cadena de cafeterias compactas para zonas financieras',
      rate: '13% EA',
      palette: 'amber' as const,
    },
    {
      title: 'Plataforma logística para entregas urbanas sostenibles',
      rate: '20% EA',
      palette: 'blue' as const,
    },
  ];

  return (
    <SceneShell accentClass="bg-[#34D399]/16">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className={cn(SURFACE_CLASSNAME, 'p-3.5')}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#6B39F4]/60">InvestApp</p>
            <h3 className="mt-1 text-[1.35rem] font-semibold tracking-tight text-slate-900">Ventures</h3>
            <p className="mt-1 text-[12px] text-slate-500">Projects published by entrepreneurs</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/78 text-[#6B39F4] shadow-[0_10px_22px_rgba(107,57,244,0.08)]">
            <IconBell />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-full border border-white/80 bg-[#F8F7FF] px-3.5 py-3 text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <IconSearch />
          <span className="text-[12px]">Search ventures, entrepreneurs or keywords...</span>
        </div>

        <div className="mt-3 flex gap-2 overflow-hidden">
          <FloatingBadge tone="violet" className="shrink-0">
            All
          </FloatingBadge>
          <FloatingBadge tone="slate" className="shrink-0">
            Technology
          </FloatingBadge>
          <FloatingBadge tone="slate" className="shrink-0">
            Commerce
          </FloatingBadge>
          <FloatingBadge tone="slate" className="shrink-0">
            Food
          </FloatingBadge>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-800">
              <IconSpark />
              <p className="text-sm font-semibold">Suggested for you</p>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Handpicked opportunities</p>
          </div>

          <div className="flex items-center gap-2">
            <FloatingBadge tone="slate" className="px-2.5">
              <IconFilter />
              Filter
            </FloatingBadge>
            <FloatingBadge tone="slate" className="px-2.5">
              <IconSort />
              Sort
            </FloatingBadge>
          </div>
        </div>

        <div className="mt-3 h-[378px] overflow-hidden rounded-[24px] border border-white/65 bg-white/28 p-1.5 backdrop-blur-sm">
          <motion.div
            animate={{
              y: marketplacePhase === 'reset' ? 0 : -362,
            }}
            transition={{
              duration: marketplacePhase === 'scroll' ? 2 : marketplacePhase === 'reset' ? 1.15 : 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="grid grid-cols-2 gap-2.5"
          >
            {marketplaceCards.map((card, index) => (
              <MockProjectCard
                key={`${card.title}-${index}`}
                title={card.title}
                rate={card.rate}
                palette={card.palette}
                flipped={marketplacePhase === 'flip' && [1, 4, 6].includes(index)}
              />
            ))}
          </motion.div>
        </div>
      </motion.div>
    </SceneShell>
  );
}

function DashboardScene() {
  return (
    <SceneShell accentClass="bg-[#2E90FA]/16">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[30px] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,#2A1A6C_0%,#171C3B_100%)] p-3.5 text-white shadow-[0_24px_54px_rgba(29,32,86,0.34)]"
      >
        <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.06] p-3 backdrop-blur-md">
          <div className="h-16 w-16 rounded-[18px] bg-[linear-gradient(135deg,#B45309_0%,#F59E0B_100%)] shadow-[0_12px_28px_rgba(245,158,11,0.28)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Venture dashboard</p>
            <p className="mt-1 truncate text-base font-semibold">Richmond Flowers</p>
            <p className="mt-1 text-[11px] text-white/65">Track fundraising and investor repayments.</p>
          </div>
          <div className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold text-white/80">
            View
          </div>
        </div>

        <div className="mt-3 rounded-[26px] border border-white/10 bg-white/[0.07] p-3 backdrop-blur-md">
          <FundingGauge progress={72} />

          <div className="mt-1 flex items-center justify-between text-[11px] text-white/72">
            <div>
              <p className="uppercase tracking-[0.22em] text-white/40">Funds raised</p>
              <p className="mt-1 text-sm font-semibold text-white">$72,000</p>
            </div>
            <div className="text-right">
              <p className="uppercase tracking-[0.22em] text-white/40">Remaining</p>
              <p className="mt-1 text-sm font-semibold text-white">$28,000</p>
            </div>
          </div>

          <div className="mt-3">
            <FloatingBadge tone="emerald" className="border-0 bg-emerald-300/15 text-emerald-200">
              55 days left
            </FloatingBadge>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.46, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className={cn(SURFACE_CLASSNAME, 'p-3.5')}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Venture status</p>
            <p className="mt-1 text-[11px] text-slate-500">A premium overview of funding, investors and next steps.</p>
          </div>
          <FloatingBadge tone="emerald">Financing in progress</FloatingBadge>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2.5">
          <MockIconTile icon={<IconWallet />} label="$100k goal" className="px-1.5" />
          <MockIconTile icon={<IconUsers />} label="24 investors" className="px-1.5" />
          <MockIconTile icon={<IconTrendUp />} label="25% EA" className="px-1.5" />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-full bg-[linear-gradient(135deg,#6B39F4_0%,#7C3AED_100%)] px-3 py-2.5 text-center text-[12px] font-semibold text-white shadow-[0_12px_28px_rgba(107,57,244,0.18)]">
            Publish
          </div>
          <div className="rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-3 py-2.5 text-center text-[12px] font-semibold text-[#6B39F4]">
            Monitor
          </div>
          <div className="rounded-full border border-rose-100 bg-rose-50 px-3 py-2.5 text-center text-[12px] font-semibold text-rose-300">
            Archive
          </div>
        </div>
      </motion.div>
    </SceneShell>
  );
}

function renderScene(id: SlideId) {
  switch (id) {
    case 'wallet':
      return <WalletScene />;
    case 'withdraw':
      return <WithdrawScene />;
    case 'marketplace':
      return <MarketplaceScene />;
    case 'dashboard':
      return <DashboardScene />;
    default:
      return null;
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const { faseApp, guardarRol, rolSeleccionado } = useInvestApp();
  const [rol, setRol] = useState<'inversor' | 'emprendedor' | null>(rolSeleccionado);
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [status, setStatus] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [stage, setStage] = useState<OnboardingStage>('slides');
  const touchStartX = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);
  const showOnboarding = faseApp === 'onboarding' || faseApp === 'login';
  const activeSlide = ONBOARDING_SLIDES[currentSlide];

  useEffect(() => {
    if (faseApp === 'dashboard') router.replace('/home');
  }, [faseApp, router]);

  useEffect(() => {
    if (faseApp === 'onboarding') {
      setStage('profile');
    }

    if (faseApp === 'login') {
      setStage('slides');
    }
  }, [faseApp]);

  useEffect(() => {
    setRol(rolSeleccionado);
  }, [rolSeleccionado]);

  if (!showOnboarding) {
    return <main className="min-h-screen bg-transparent" />;
  }

  const completeSlides = () => {
    if (faseApp === 'login') {
      router.push('/login');
      return;
    }

    setStage('profile');
  };

  const goToNext = () => {
    if (currentSlide >= ONBOARDING_SLIDES.length - 1) {
      completeSlides();
      return;
    }

    setCurrentSlide((previous) => Math.min(previous + 1, ONBOARDING_SLIDES.length - 1));
  };

  const goToPrevious = () => {
    setCurrentSlide((previous) => Math.max(0, previous - 1));
  };

  const skipSlides = () => {
    router.push('/login');
  };

  const handleTouchStart = (clientX: number) => {
    touchStartX.current = clientX;
    touchCurrentX.current = clientX;
  };

  const handleTouchMove = (clientX: number) => {
    touchCurrentX.current = clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchCurrentX.current === null) {
      touchStartX.current = null;
      touchCurrentX.current = null;
      return;
    }

    const deltaX = touchCurrentX.current - touchStartX.current;

    if (deltaX <= -SWIPE_THRESHOLD) {
      goToNext();
    } else if (deltaX >= SWIPE_THRESHOLD) {
      goToPrevious();
    }

    touchStartX.current = null;
    touchCurrentX.current = null;
  };

  if (stage === 'profile') {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent px-5 py-8 text-gray-900">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/fondo_home.jpg')" }}
        />
        <div className="absolute inset-0 bg-white/35 backdrop-blur-[3px]" />

        <section className="relative mx-auto w-full max-w-xl rounded-[30px] border border-white/35 bg-white/75 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mb-6 flex items-center justify-center"
          >
            <InvestAppWordmark />
          </motion.div>

          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6B39F4]/70">
              Welcome
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Choose your profile
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              We will tailor your experience depending on whether you want to invest in ventures or
              grow your own business.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={() => setRol('inversor')}
              className={cn(
                'rounded-[24px] border px-5 py-5 text-left transition',
                rol === 'inversor'
                  ? 'border-[#6B39F4]/35 bg-[#6B39F4]/10 text-[#6B39F4] shadow-[0_14px_28px_rgba(107,57,244,0.12)]'
                  : 'border-slate-200/80 bg-white/80 text-slate-700 hover:bg-white'
              )}
            >
              <p className="text-base font-semibold">Investor</p>
              <p className={cn('mt-1 text-sm', rol === 'inversor' ? 'text-[#6B39F4]/80' : 'text-slate-500')}>
                Explore businesses and invest with confidence.
              </p>
            </button>

            <button
              onClick={() => setRol('emprendedor')}
              className={cn(
                'rounded-[24px] border px-5 py-5 text-left transition',
                rol === 'emprendedor'
                  ? 'border-[#40C4AA]/35 bg-[#40C4AA]/12 text-[#1C9A82] shadow-[0_14px_28px_rgba(64,196,170,0.12)]'
                  : 'border-slate-200/80 bg-white/80 text-slate-700 hover:bg-white'
              )}
            >
              <p className="text-base font-semibold">Entrepreneur</p>
              <p className={cn('mt-1 text-sm', rol === 'emprendedor' ? 'text-[#1C9A82]/80' : 'text-slate-500')}>
                Publish your business and connect with investors.
              </p>
            </button>
          </div>

          <label className="mt-6 flex items-start gap-3 rounded-2xl border border-white/55 bg-white/70 px-4 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={acceptsTerms}
              onChange={(event) => setAcceptsTerms(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#6B39F4]"
            />
            <span>
              I accept the{' '}
              <a
                href="https://www.investappgroup.com"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#6B39F4] underline decoration-[#6B39F4]/40 underline-offset-2"
              >
                terms and conditions
              </a>
              .
            </span>
          </label>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              disabled={!rol || !acceptsTerms || savingRole}
              className="w-full rounded-[18px] bg-[#6B39F4] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(107,57,244,0.22)] transition hover:bg-[#5c2ff0] disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
              onClick={async () => {
                if (!rol) return;
                if (faseApp === 'login') {
                  router.push('/login');
                  return;
                }
                setSavingRole(true);
                setStatus('');
                try {
                  await guardarRol(rol);
                } catch (error) {
                  setStatus(
                    error instanceof Error
                      ? error.message
                      : 'We could not finish updating your role.'
                  );
                } finally {
                  setSavingRole(false);
                }
              }}
            >
              {savingRole ? 'Saving...' : 'Continue'}
            </button>

            <button
              type="button"
              onClick={() => setStage('slides')}
              className="w-full text-center text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              Back to onboarding
            </button>
          </div>

          {status ? <p className="mt-4 text-center text-sm text-rose-600">{status}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F8FF] px-3 py-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(167,139,250,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(52,211,153,0.16),transparent_28%),linear-gradient(180deg,#FBFBFF_0%,#F4F5FF_100%)]" />
      <div className="absolute left-[8%] top-[10%] h-40 w-40 rounded-full bg-[#8B5CF6]/14 blur-[110px]" />
      <div className="absolute bottom-[8%] right-[6%] h-44 w-44 rounded-full bg-[#22C55E]/10 blur-[120px]" />

      <div
        className="relative w-full max-w-[410px] touch-pan-y select-none"
        onTouchStart={(event) => handleTouchStart(event.touches[0]?.clientX ?? 0)}
        onTouchMove={(event) => handleTouchMove(event.touches[0]?.clientX ?? 0)}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative mx-auto aspect-[271/588] w-full overflow-hidden rounded-[38px] border border-white/80 bg-white/58 p-4 shadow-[0_26px_90px_rgba(85,65,165,0.18)] backdrop-blur-3xl">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.52)_0%,rgba(249,249,255,0.72)_100%)]" />
          <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-white/55 blur-3xl" />

          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center justify-between">
              <InvestAppWordmark compact />
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/78 text-[#6B39F4] shadow-[0_12px_28px_rgba(107,57,244,0.08)]">
                <IconMenu />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                className="mt-4 flex min-h-0 flex-1 flex-col gap-4"
              >
                <div className="min-h-0 flex-[0_0_52%]">{renderScene(activeSlide.id)}</div>

                <div className="min-h-[236px] flex-[0_0_42%]">
                  <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[32px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0.14)_100%)] p-5 shadow-[0_22px_54px_rgba(85,65,165,0.12)] ring-1 ring-white/35 backdrop-blur-[26px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.48),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.14),transparent_42%)]" />
                    <div className="absolute inset-x-6 top-0 h-16 rounded-full bg-white/35 blur-3xl" />

                    <div className="relative">
                      <div className="mx-auto max-w-[84%] text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6B39F4]/62">
                          {activeSlide.eyebrow}
                        </p>
                        <h1 className="mt-2 text-[1.85rem] font-semibold tracking-tight text-slate-900">
                          {activeSlide.title}
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{activeSlide.description}</p>
                      </div>

                      <button
                        type="button"
                        onClick={skipSlides}
                        className="absolute right-0 top-0 rounded-full border border-white/65 bg-white/42 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-[0_12px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl transition hover:text-slate-700"
                      >
                        Skip
                      </button>
                    </div>

                    <div className="relative mt-6 flex items-end justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-[#F3EFFF]/92 px-2.5 py-1 text-[10px] font-semibold text-[#6B39F4] shadow-[0_10px_24px_rgba(107,57,244,0.08)]">
                          {String(currentSlide + 1).padStart(2, '0')} /{' '}
                          {String(ONBOARDING_SLIDES.length).padStart(2, '0')}
                        </div>
                        <div className="flex items-center gap-1.5 rounded-full border border-white/60 bg-white/34 px-2.5 py-2 backdrop-blur-xl">
                          {ONBOARDING_SLIDES.map((slide, index) => (
                            <span
                              key={slide.id}
                              className={cn(
                                'h-2 rounded-full transition-all duration-300',
                                index === currentSlide ? 'w-7 bg-[#6B39F4]' : 'w-2 bg-[#D8DCEB]'
                              )}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {currentSlide > 0 ? (
                          <button
                            type="button"
                            aria-label="Previous slide"
                            onClick={goToPrevious}
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/65 bg-white/42 text-slate-500 shadow-[0_12px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl transition hover:text-slate-700"
                          >
                            <IconArrowLeft />
                          </button>
                        ) : null}

                        <button
                          type="button"
                          aria-label={
                            currentSlide === ONBOARDING_SLIDES.length - 1
                              ? 'Finish onboarding'
                              : 'Next slide'
                          }
                          onClick={goToNext}
                          className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#6B39F4_0%,#2563EB_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:scale-[1.01]"
                        >
                          <span>{currentSlide === ONBOARDING_SLIDES.length - 1 ? 'Continue' : 'Next'}</span>
                          <IconArrowRight />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}
