'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import BottomNav from '@/components/BottomNav';
import { useInvestApp } from '@/lib/investapp-context';
import {
  clearPendingInvestment,
  getPendingInvestment,
  type PendingInvestment,
} from '@/lib/pending-investment';
import { useUserProfileSummary } from '@/lib/use-user-profile-summary';
import { fetchCurrentUserTransactions } from '@/utils/client/current-user-transactions';
import { runUserDirectoryQuery } from '@/utils/supabase/user-directory';
import type { CurrentUserTransaction } from '@/utils/transactions/current-user';

type WalletTarget = {
  id: string;
  name: string | null;
  surname: string | null;
  avatar_url: string | null;
  country: string | null;
  role: 'investor' | 'entrepreneur';
  wallet_address: string | null;
};

type RecentWallet = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  walletAddress: string;
};

type TxRow = Pick<CurrentUserTransaction, 'from_wallet' | 'to_wallet'>;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const suggestedValues = [100, 200, 250, 300, 350, 400];

const nameFrom = (target: Partial<WalletTarget> | null | undefined) => {
  const full = `${target?.name ?? ''} ${target?.surname ?? ''}`.trim();
  if (full) return full;
  if (target?.wallet_address) return `${target.wallet_address.slice(0, 6)}...`;
  return 'Wallet user';
};

const initialsFrom = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';

const hasEmbeddedPrivyWallet = (
  user:
    | {
        linkedAccounts?: Array<{
          type?: string;
          walletClientType?: string;
          chainType?: string;
          address?: string;
        }>;
      }
    | null
    | undefined
) =>
  (user?.linkedAccounts ?? []).some(
    (account) =>
      account.type === 'wallet' &&
      account.walletClientType === 'privy' &&
      typeof account.address === 'string' &&
      (account.chainType === 'ethereum' || !account.chainType)
  );

const formatAmount = (value: string) => {
  const sanitized = value.replace(/[^0-9.]/g, '');
  const parts = sanitized.split('.');
  const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
  const numberValue = Number(normalized);
  return Number.isNaN(numberValue) ? '' : numberValue.toFixed(2);
};

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

function RefreshIcon() {
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
      <path d="M20 11a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}

function WalletIcon() {
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
      <rect x="3.5" y="6.5" width="17" height="11" rx="3" />
      <path d="M15.5 10.5h5" />
      <path d="M16.5 12h.01" />
    </svg>
  );
}

function ScanIcon() {
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
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
      <path d="M8 8h8v8H8z" opacity="0.28" />
    </svg>
  );
}

function CurrencyIcon() {
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
      <circle cx="12" cy="12" r="8" />
      <path d="M13.9 9.4c0-.8-.9-1.4-2-1.4s-2 .6-2 1.4c0 2 4 1 4 3.2 0 .9-.9 1.5-2 1.5s-2-.6-2-1.5" />
      <path d="M12 7.2v9.6" />
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

function PaperPlaneIcon() {
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
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22l-4-9-9-4z" />
    </svg>
  );
}

function ContactAvatar({
  avatarUrl,
  label,
  sizeClassName = 'h-12 w-12',
}: {
  avatarUrl: string | null | undefined;
  label: string;
  sizeClassName?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-full border border-white/75 bg-[linear-gradient(180deg,#F5F0FF_0%,#FFFFFF_100%)] ${sizeClassName}`}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#6B39F4]">
          {initialsFrom(label)}
        </div>
      )}
      <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border border-white bg-[#6B39F4]" />
    </div>
  );
}

export default function WalletTransferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getAccessToken, createWallet } = usePrivy();
  const { avatarUrl, displayName } = useUserProfileSummary();
  const {
    faseApp,
    rolSeleccionado,
    walletTargets,
    loadingWallets,
    loadingTx,
    smartWalletAddress,
    balanceUSDC,
    cargarWalletsObjetivo,
    enviarUSDC,
  } = useInvestApp();

  const mode = searchParams.get('mode');
  const repaymentProjectId = searchParams.get('projectId');
  const repaymentInvestorUserId = searchParams.get('investorUserId');
  const allowPendingInvestment = mode !== 'repayment' && mode !== 'transfer';
  const transferMode =
    mode === 'repayment' && rolSeleccionado === 'emprendedor' ? 'repayment' : 'transfer';

  const [pendingInvestment, setPendingInvestment] = useState<PendingInvestment | null>(() =>
    allowPendingInvestment ? getPendingInvestment(user?.id) : null
  );
  const [walletDestino, setWalletDestino] = useState('');
  const [monto, setMonto] = useState('200.00');
  const [recentWallets, setRecentWallets] = useState<RecentWallet[]>([]);
  const [loadingRecentWallets, setLoadingRecentWallets] = useState(false);
  const [settingUpWallet, setSettingUpWallet] = useState(false);
  const [showAllWallets, setShowAllWallets] = useState(false);
  const alreadyHasEmbeddedWallet = useMemo(() => hasEmbeddedPrivyWallet(user), [user]);

  const supabase = useMemo(() => {
    const authedFetch: typeof fetch = async (input, init = {}) => {
      const token = await getAccessToken();
      const baseHeaders = new Headers(init.headers ?? {});
      baseHeaders.set('apikey', SUPABASE_ANON_KEY);
      const run = (headers: Headers) => fetch(input, { ...init, headers });
      if (!token) return run(baseHeaders);

      const headersWithAuth = new Headers(baseHeaders);
      headersWithAuth.set('Authorization', `Bearer ${token}`);
      const response = await run(headersWithAuth);
      if (response.ok) return response;

      const raw = (await response.clone().text()).toLowerCase();
      const shouldFallback =
        response.status === 401 ||
        response.status === 403 ||
        raw.includes('wrong key type') ||
        raw.includes('invalid jwt');

      return shouldFallback ? run(baseHeaders) : response;
    };

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { fetch: authedFetch } });
  }, [getAccessToken]);

  const mappedTargets = useMemo(
    () =>
      (walletTargets as WalletTarget[])
        .filter((target) => target.wallet_address)
        .map((target) => ({
          id: target.id,
          displayName: nameFrom(target),
          avatarUrl: target.avatar_url,
          walletAddress: target.wallet_address ?? '',
        })),
    [walletTargets]
  );

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    void cargarWalletsObjetivo();
  }, [cargarWalletsObjetivo]);

  useEffect(() => {
    if (!allowPendingInvestment) {
      setPendingInvestment(null);
      return;
    }

    if (typeof window === 'undefined') return undefined;
    const syncPending = () => setPendingInvestment(getPendingInvestment(user?.id));
    syncPending();
    window.addEventListener('focus', syncPending);
    return () => window.removeEventListener('focus', syncPending);
  }, [allowPendingInvestment, user?.id]);

  useEffect(() => {
    if (pendingInvestment) {
      setWalletDestino(pendingInvestment.entrepreneurWallet);
      setMonto(pendingInvestment.amountUsdc);
      return;
    }

    setWalletDestino(searchParams.get('wallet') ?? '');
    setMonto(searchParams.get('amount') ?? '200.00');
  }, [pendingInvestment, searchParams]);

  const loadRecentWallets = useCallback(async () => {
    if (!user?.id || !smartWalletAddress) {
      setRecentWallets([]);
      setLoadingRecentWallets(false);
      return;
    }

    setLoadingRecentWallets(true);
    try {
      const { data, error } = await fetchCurrentUserTransactions(getAccessToken, {
        limit: 24,
        wallet: smartWalletAddress,
      });
      if (error) throw new Error(error);

      const orderedAddresses: string[] = [];
      const seen = new Set<string>();
      const current = smartWalletAddress.toLowerCase();

      ((data ?? []) as TxRow[]).forEach((row) => {
        const other =
          row.from_wallet?.toLowerCase() === current ? row.to_wallet : row.from_wallet;
        if (!other) return;
        const normalized = other.toLowerCase();
        if (normalized === current || seen.has(normalized)) return;
        seen.add(normalized);
        orderedAddresses.push(other);
      });

      const { data: profilesData } =
        orderedAddresses.length > 0
          ? await runUserDirectoryQuery(supabase, (source) =>
              supabase
                .from(source)
                .select('id,name,surname,avatar_url,country,role,wallet_address')
                .in('wallet_address', orderedAddresses.slice(0, 12))
            )
          : { data: [] };

      const profileMap = new Map(
        ((profilesData ?? []) as WalletTarget[])
          .filter((profile) => profile.wallet_address)
          .map((profile) => [profile.wallet_address?.toLowerCase() ?? '', profile])
      );

      const recent = orderedAddresses
        .map((address) => {
          const normalized = address.toLowerCase();
          const profile = profileMap.get(normalized);

          if (profile) {
            return {
              id: profile.id,
              displayName: nameFrom(profile),
              avatarUrl: profile.avatar_url,
              walletAddress: profile.wallet_address ?? address,
            };
          }

          return (
            mappedTargets.find((target) => target.walletAddress.toLowerCase() === normalized) ??
            null
          );
        })
        .filter((item): item is RecentWallet => Boolean(item));

      setRecentWallets(recent.slice(0, 6));
    } catch (error) {
      console.error('Error loading recent wallets:', error);
      setRecentWallets([]);
    } finally {
      setLoadingRecentWallets(false);
    }
  }, [getAccessToken, mappedTargets, smartWalletAddress, supabase, user?.id]);

  useEffect(() => {
    void loadRecentWallets();
  }, [loadRecentWallets]);

  const visibleWallets = useMemo(
    () => (showAllWallets ? recentWallets : recentWallets.slice(0, 1)),
    [recentWallets, showAllWallets]
  );

  const amountNumber = Number(monto);
  const canSubmit = Boolean(walletDestino.trim() && Number(monto) > 0 && smartWalletAddress);
  const canRefresh = !loadingWallets && !loadingRecentWallets;
  const numericBalance = Number(balanceUSDC ?? 0);
  const safeBalanceValue = Number.isFinite(numericBalance) ? Math.max(numericBalance, 0) : 0;
  const displaySourceWallet = smartWalletAddress ?? 'Smart wallet not ready yet';

  const handleRefresh = async () => {
    await Promise.all([cargarWalletsObjetivo(), loadRecentWallets()]);
  };

  const handleSetUpWallet = async () => {
    if (settingUpWallet || alreadyHasEmbeddedWallet) return;

    setSettingUpWallet(true);
    try {
      await createWallet();
    } catch (error) {
      console.error('Error creating embedded wallet from transfer page:', error);
      alert('We could not finish setting up your wallet yet. Please try again in a moment.');
    } finally {
      setSettingUpWallet(false);
    }
  };

  const handleSubmit = async () => {
    const result = await enviarUSDC(
      walletDestino,
      formatAmount(monto) || monto,
      pendingInvestment
        ? undefined
        : {
            movementType: transferMode,
            projectId: transferMode === 'repayment' ? repaymentProjectId : null,
            investorUserId: transferMode === 'repayment' ? repaymentInvestorUserId : null,
          }
    );

    if (!result.success) return;

    if (pendingInvestment) {
      clearPendingInvestment(user?.id);
      setPendingInvestment(null);
    }

    if (transferMode === 'repayment' && !pendingInvestment) {
      router.replace('/invest/repayments');
      return;
    }

    setMonto('');
    setWalletDestino('');
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(123,92,255,0.08),transparent_36%),linear-gradient(180deg,#F8F8FD_0%,#F5F6FB_100%)] pb-32 text-[#0F172A]">
      <div className="mx-auto w-full max-w-xl px-4 pb-6 pt-4 sm:px-5">
        <header className="mb-7 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-0.5 text-[0.95rem] font-semibold tracking-[-0.03em] text-[#141B34]">
              <span>Invest</span>
              <span className="text-[#6B39F4]">App</span>
              <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#6B39F4]" />
            </div>
            <h1 className="mt-5 text-[2.62rem] font-semibold tracking-[-0.07em] text-[#18213C]">
              Send to a Wallet
            </h1>
            <p className="mt-1 max-w-[320px] text-[0.98rem] leading-6 tracking-[-0.02em] text-slate-500">
              Enter a wallet manually or pick one of your recent wallets
            </p>
          </div>

          <Link
            href="/profile"
            aria-label="Open profile"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/82 text-slate-500 shadow-[0_18px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:text-[#6B39F4]"
          >
            <MenuDotsIcon />
          </Link>
        </header>

        <div className="space-y-5">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[1rem] font-semibold tracking-[-0.03em] text-[#1C2340]">
                Send to
              </h2>
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={!canRefresh}
                className="inline-flex items-center gap-2 rounded-full border border-[#E9E3FF] bg-white/78 px-4 py-2 text-sm font-semibold tracking-[-0.02em] text-[#7C5CFF] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:bg-white disabled:opacity-60"
              >
                <RefreshIcon />
                Refresh
              </button>
            </div>

            <div className="rounded-[26px] border border-white/80 bg-white/92 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <div className="flex items-center gap-3 rounded-[20px] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFBFF_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1EBFF] text-[#7C5CFF]">
                  <WalletIcon />
                </div>
                <input
                  type="text"
                  value={walletDestino}
                  onChange={(event) => setWalletDestino(event.target.value)}
                  placeholder="Paste or type a 0x wallet address"
                  className="w-full bg-transparent text-[0.98rem] font-medium tracking-[-0.02em] text-[#18213C] outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  aria-label="Scan wallet address"
                  onClick={() => void 0}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#7C5CFF] transition hover:bg-[#F7F4FF]"
                >
                  <ScanIcon />
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-white/80 bg-white/92 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <h2 className="text-[1rem] font-semibold tracking-[-0.03em] text-[#1C2340]">
                Recent wallets
              </h2>
              <button
                type="button"
                onClick={() => setShowAllWallets((current) => !current)}
                className="inline-flex items-center gap-1 text-sm font-semibold tracking-[-0.02em] text-[#7C5CFF] transition hover:text-[#5B48FF]"
              >
                {recentWallets.length > 1 && showAllWallets ? 'Show less' : 'View all'}
                <ChevronRightIcon />
              </button>
            </div>

            <div className="space-y-3">
              {loadingWallets || loadingRecentWallets ? (
                <div className="rounded-[22px] bg-[#FAFAFE] px-4 py-4 text-sm text-slate-500">
                  Loading wallets...
                </div>
              ) : visibleWallets.length > 0 ? (
                visibleWallets.map((wallet) => {
                  const isSelected =
                    walletDestino.toLowerCase() === wallet.walletAddress.toLowerCase();

                  return (
                    <div
                      key={wallet.id}
                      className={`flex items-center gap-3 rounded-[22px] border px-4 py-4 transition ${
                        isSelected
                          ? 'border-[#E3D9FF] bg-[#FAF8FF]'
                          : 'border-[#F0F0F6] bg-[#FAFAFE]'
                      }`}
                    >
                      <ContactAvatar avatarUrl={wallet.avatarUrl} label={wallet.displayName} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[1rem] font-semibold tracking-[-0.03em] text-[#1C2340]">
                          {wallet.displayName}
                        </p>
                        <p className="truncate text-[12px] leading-5 text-slate-400">
                          {wallet.walletAddress}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWalletDestino(wallet.walletAddress)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold tracking-[-0.02em] transition ${
                          isSelected
                            ? 'border-[#7C5CFF] bg-[#7C5CFF] text-white shadow-[0_14px_26px_rgba(124,92,255,0.18)]'
                            : 'border-[#E4D9FF] bg-white text-[#7C5CFF] hover:bg-[#F8F4FF]'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[22px] border border-dashed border-[#E8E8F2] bg-[#FAFAFE] px-4 py-5 text-sm leading-6 text-slate-500">
                  No recent wallets yet. You can still paste any wallet manually.
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[1rem] font-semibold tracking-[-0.03em] text-[#1C2340]">
                From
              </h2>
              {!smartWalletAddress && !alreadyHasEmbeddedWallet ? (
                <button
                  type="button"
                  onClick={() => void handleSetUpWallet()}
                  disabled={settingUpWallet}
                  className="rounded-full border border-[#E9E3FF] bg-white/78 px-4 py-2 text-sm font-semibold tracking-[-0.02em] text-[#7C5CFF] shadow-[0_10px_24px_rgba(15,23,42,0.04)] disabled:opacity-60"
                >
                  {settingUpWallet ? 'Setting up...' : 'Set up'}
                </button>
              ) : null}
            </div>

            <div className="rounded-[26px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <ContactAvatar avatarUrl={avatarUrl} label={displayName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] leading-5 text-slate-400">{displayName}</p>
                  <p className="max-w-[240px] break-all text-[12px] leading-5 text-slate-400">
                    {displaySourceWallet}
                  </p>
                  {!smartWalletAddress ? (
                    <p className="mt-1 text-[11px] leading-4 text-slate-400">
                      {alreadyHasEmbeddedWallet
                        ? 'Waiting for your smart wallet session to finish syncing.'
                        : 'Finish setting up your wallet to send funds.'}
                    </p>
                  ) : null}
                </div>
                <span className="text-slate-300">
                  <ChevronRightIcon />
                </span>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[1rem] font-semibold tracking-[-0.03em] text-[#1C2340]">
                Amount
              </h2>
            </div>

            <div className="rounded-[26px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1EBFF] text-[#7C5CFF]">
                  <CurrencyIcon />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    USD
                  </p>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={monto}
                  onChange={(event) => setMonto(event.target.value.replace(/[^0-9.]/g, ''))}
                  onBlur={() => setMonto(formatAmount(monto))}
                  className="min-w-0 flex-1 bg-transparent text-[2.2rem] font-semibold tracking-[-0.06em] text-[#18213C] outline-none"
                  placeholder="0.00"
                />
                <button
                  type="button"
                  onClick={() => setMonto(safeBalanceValue.toFixed(2))}
                  className="rounded-full border border-[#E4D9FF] bg-white px-4 py-2 text-sm font-semibold tracking-[-0.02em] text-[#7C5CFF] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:bg-[#F8F4FF]"
                >
                  MAX
                </button>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-[0.96rem] font-semibold tracking-[-0.03em] text-slate-500">
              Suggested value
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {suggestedValues.map((value) => {
                const selected = amountNumber === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMonto(value.toFixed(2))}
                    className={`rounded-[18px] border py-4 text-center text-[1rem] font-semibold tracking-[-0.03em] transition ${
                      selected
                        ? 'border-transparent bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] text-white shadow-[0_20px_38px_rgba(124,92,255,0.28)]'
                        : 'border-[#ECECF4] bg-white/90 text-[#364152] shadow-[0_10px_24px_rgba(15,23,42,0.04)] hover:bg-white'
                    }`}
                  >
                    ${value}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="pt-1">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit || loadingTx}
              className={`flex w-full items-center justify-center gap-2 rounded-[20px] px-5 py-4 text-[1.02rem] font-semibold tracking-[-0.03em] text-white shadow-[0_22px_46px_rgba(107,57,244,0.34)] transition ${
                !canSubmit || loadingTx
                  ? 'bg-[linear-gradient(135deg,rgba(124,92,255,0.45)_0%,rgba(91,72,255,0.45)_100%)]'
                  : 'bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] hover:-translate-y-0.5'
              }`}
            >
              <PaperPlaneIcon />
              {loadingTx ? 'Processing...' : 'Send'}
            </button>
          </section>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
