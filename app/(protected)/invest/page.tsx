'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import BottomNav from '@/components/BottomNav';
import { useInvestApp } from '@/lib/investapp-context';
import { getPendingInvestment } from '@/lib/pending-investment';

type ContactItem = {
  id: string;
  displayName: string;
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

function MenuDotsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
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
            Send to a Wallet
          </h2>
          <p className="mt-3 text-sm leading-6 tracking-[-0.02em] text-white/86">
            Enter a wallet address manually or pick one of your recent contacts.
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

export default function InvestPage() {
  const router = useRouter();
  const { user } = usePrivy();
  const { faseApp, rolSeleccionado, walletTargets, loadingWallets, cargarWalletsObjetivo } =
    useInvestApp();
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
          displayName:
            `${target.name ?? ''} ${target.surname ?? ''}`.trim() ||
            `${target.wallet_address?.slice(0, 6) ?? 'Wallet'}...`,
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

  if (hasPendingInvestment) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(123,92,255,0.10),transparent_36%),linear-gradient(180deg,#F7F8FC_0%,#F4F6FB_100%)] pb-36 text-[#0F172A]">
        <div className="mx-auto w-full max-w-xl px-4 pb-6 pt-4 sm:px-5">
          <header className="mb-7 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-0.5 text-[0.95rem] font-semibold tracking-[-0.03em] text-[#141B34]">
                <span>Invest</span>
                <span className="text-[#6B39F4]">App</span>
                <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#6B39F4]" />
              </div>
              <h1 className="mt-5 text-[2.65rem] font-semibold tracking-[-0.07em] text-[#18213C]">
                Send
              </h1>
              <p className="mt-1 text-[0.98rem] leading-6 tracking-[-0.02em] text-slate-500">
                Preparing your investment transfer
              </p>
            </div>

            <Link
              href="/profile"
              aria-label="Open profile"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/80 text-slate-500 shadow-[0_18px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl"
            >
              <MenuDotsIcon />
            </Link>
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(123,92,255,0.10),transparent_36%),linear-gradient(180deg,#F7F8FC_0%,#F4F6FB_100%)] pb-36 text-[#0F172A]">
      <div className="mx-auto w-full max-w-xl px-4 pb-6 pt-4 sm:px-5">
        <header className="mb-7 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-0.5 text-[0.95rem] font-semibold tracking-[-0.03em] text-[#141B34]">
              <span>Invest</span>
              <span className="text-[#6B39F4]">App</span>
              <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#6B39F4]" />
            </div>
            <h1 className="mt-5 text-[2.65rem] font-semibold tracking-[-0.07em] text-[#18213C]">
              Send
            </h1>
            <p className="mt-1 text-[0.98rem] leading-6 tracking-[-0.02em] text-slate-500">
              Choose how you want to move funds
            </p>
          </div>

          <Link
            href="/profile"
            aria-label="Open profile"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/80 text-slate-500 shadow-[0_18px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:text-[#6B39F4]"
          >
            <MenuDotsIcon />
          </Link>
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
                      href={`/invest/wallet?mode=transfer&wallet=${encodeURIComponent(
                        contact.walletAddress
                      )}`}
                      className="flex w-[76px] shrink-0 flex-col items-center gap-2 text-center"
                    >
                      <ContactAvatar
                        avatarUrl={contact.avatarUrl}
                        label={contact.displayName}
                        sizeClassName="h-14 w-14"
                        textClassName="text-sm"
                      />
                      <span className="line-clamp-1 text-xs font-medium tracking-[-0.02em] text-slate-600">
                        {contact.displayName}
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
  );
}
