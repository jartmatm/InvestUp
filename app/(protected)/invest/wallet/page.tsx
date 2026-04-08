'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import PageFrame from '@/components/PageFrame';
import { useInvestApp } from '@/lib/investapp-context';
import { clearPendingInvestment, getPendingInvestment, type PendingInvestment } from '@/lib/pending-investment';
import { useUserProfileSummary } from '@/lib/use-user-profile-summary';

type WalletTarget = {
  id: string;
  email: string | null;
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

type TxRow = {
  from_wallet: string | null;
  to_wallet: string | null;
};

type SectionProps = {
  title: string;
  rightSlot?: ReactNode;
  children: ReactNode;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const nameFrom = (target: Partial<WalletTarget> | null | undefined) => {
  const full = `${target?.name ?? ''} ${target?.surname ?? ''}`.trim();
  if (full) return full;
  if (target?.email) return target.email.split('@')[0];
  return 'Wallet user';
};

const initialsFrom = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';

function Section({ title, rightSlot, children }: SectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {rightSlot}
      </div>
      <div className="rounded-[22px] border border-white/25 bg-white/20 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
        {children}
      </div>
    </div>
  );
}

function Avatar({ avatarUrl, label }: { avatarUrl?: string | null; label: string }) {
  return (
    <div className="h-12 w-12 overflow-hidden rounded-full border border-white/25 bg-white/20">
      {avatarUrl ? (
        <img src={avatarUrl} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary">
          {initialsFrom(label)}
        </div>
      )}
    </div>
  );
}

export default function WalletTransferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getAccessToken } = usePrivy();
  const { avatarUrl, displayName } = useUserProfileSummary();
  const {
    faseApp,
    rolSeleccionado,
    walletTargets,
    loadingWallets,
    loadingTx,
    smartWalletAddress,
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
    allowPendingInvestment ? getPendingInvestment() : null
  );
  const [walletDestino, setWalletDestino] = useState('');
  const [monto, setMonto] = useState('200.00');
  const [recentWallets, setRecentWallets] = useState<RecentWallet[]>([]);
  const [loadingRecentWallets, setLoadingRecentWallets] = useState(false);

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
        response.status === 401 || response.status === 403 || raw.includes('wrong key type') || raw.includes('invalid jwt');
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

  const formatAmount = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
    const numberValue = Number(normalized);
    return Number.isNaN(numberValue) ? '' : numberValue.toFixed(2);
  };

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
    const syncPending = () => setPendingInvestment(getPendingInvestment());
    syncPending();
    window.addEventListener('focus', syncPending);
    return () => window.removeEventListener('focus', syncPending);
  }, [allowPendingInvestment]);

  useEffect(() => {
    if (pendingInvestment) {
      setWalletDestino(pendingInvestment.entrepreneurWallet);
      setMonto(pendingInvestment.amountUsdc);
      return;
    }
    setWalletDestino(searchParams.get('wallet') ?? '');
    setMonto(searchParams.get('amount') ?? '200.00');
  }, [pendingInvestment, searchParams]);

  useEffect(() => {
    const loadRecentWallets = async () => {
      if (!smartWalletAddress) {
        setRecentWallets(mappedTargets.slice(0, 3));
        return;
      }

      setLoadingRecentWallets(true);
      try {
        const filters = [`from_wallet.eq.${smartWalletAddress}`, `to_wallet.eq.${smartWalletAddress}`];
        if (user?.id) filters.unshift(`user_id.eq.${user.id}`);
        const { data, error } = await supabase
          .from('transactions')
          .select('from_wallet,to_wallet')
          .or(filters.join(','))
          .order('created_at', { ascending: false })
          .limit(24);
        if (error) throw error;

        const orderedAddresses: string[] = [];
        const seen = new Set<string>();
        const current = smartWalletAddress.toLowerCase();
        ((data ?? []) as TxRow[]).forEach((row) => {
          const other = row.from_wallet?.toLowerCase() === current ? row.to_wallet : row.from_wallet;
          if (!other) return;
          const normalized = other.toLowerCase();
          if (normalized === current || seen.has(normalized)) return;
          seen.add(normalized);
          orderedAddresses.push(other);
        });

        const { data: profilesData } =
          orderedAddresses.length > 0
            ? await supabase
                .from('users')
                .select('id,email,name,surname,avatar_url,country,role,wallet_address')
                .in('wallet_address', orderedAddresses.slice(0, 6))
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
            return mappedTargets.find((target) => target.walletAddress.toLowerCase() === normalized) ?? null;
          })
          .filter((item): item is RecentWallet => Boolean(item));

        if (recent.length === 0) {
          setRecentWallets(mappedTargets.slice(0, 3));
        } else {
          setRecentWallets([...recent, ...mappedTargets].filter((item, index, arr) => {
            return arr.findIndex((entry) => entry.walletAddress === item.walletAddress) === index;
          }).slice(0, 3));
        }
      } catch (error) {
        console.error('Error loading recent wallets:', error);
        setRecentWallets(mappedTargets.slice(0, 3));
      } finally {
        setLoadingRecentWallets(false);
      }
    };

    void loadRecentWallets();
  }, [mappedTargets, smartWalletAddress, supabase, user?.id]);

  const suggestions = [100, 200, 250, 300, 350, 400];
  const amountNumber = Number(monto);
  const canSubmit = Boolean(walletDestino && Number(monto) > 0);
  const submitLabel = pendingInvestment ? 'Confirm transfer' : transferMode === 'repayment' ? 'Send repayment' : 'Send';
  const helper = pendingInvestment
    ? 'Review the investment details and confirm the transfer to the entrepreneur.'
    : transferMode === 'repayment'
      ? 'Choose an investor wallet and confirm the repayment.'
      : 'Enter a wallet manually or pick one of your recent wallets.';

  return (
    <PageFrame
      title={pendingInvestment ? 'Investment transfer' : transferMode === 'repayment' ? 'Send repayment' : 'Send to a Wallet'}
      subtitle={helper}
    >
      <div className="space-y-6 pb-40">
        {pendingInvestment ? (
          <div className="rounded-[22px] border border-primary/15 bg-primary/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Investment ready</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">{pendingInvestment.projectTitle}</h2>
            <p className="mt-1 text-sm text-gray-600">{pendingInvestment.entrepreneurName}</p>
          </div>
        ) : null}

        <Section
          title="Send to"
          rightSlot={
            <button type="button" onClick={() => void cargarWalletsObjetivo()} className="rounded-full border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              Refresh
            </button>
          }
        >
          <div className="px-4 pb-4 pt-4">
            <input
              type="text"
              value={walletDestino}
              onChange={(event) => setWalletDestino(event.target.value)}
              placeholder="Paste or type a 0x wallet address"
              className="w-full rounded-xl border border-white/25 bg-white/20 px-4 py-3 text-sm text-gray-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="border-t border-white/15 px-4 pb-3 pt-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Recent wallets</p>
          </div>
          {loadingWallets || loadingRecentWallets ? <p className="px-4 pb-4 text-sm text-gray-500">Loading wallets...</p> : null}
          {!loadingWallets && !loadingRecentWallets && recentWallets.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-gray-500">No recent wallets yet. You can still paste any wallet manually.</p>
          ) : null}
          <div className="divide-y divide-white/15">
            {recentWallets.slice(0, 3).map((wallet) => {
              const isActive = walletDestino.toLowerCase() === wallet.walletAddress.toLowerCase();
              return (
                <button
                  key={wallet.id}
                  type="button"
                  onClick={() => setWalletDestino(wallet.walletAddress)}
                  className={`flex w-full items-center gap-3 px-4 py-4 text-left ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`}
                >
                  <Avatar avatarUrl={wallet.avatarUrl} label={wallet.displayName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{wallet.displayName}</p>
                    <p className="truncate text-xs text-gray-500">{wallet.walletAddress}</p>
                  </div>
                  <span className={`text-xs font-semibold ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                    {isActive ? 'Selected' : 'Select'}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="From">
          <div className="flex items-center gap-3 px-4 py-4">
            <Avatar avatarUrl={avatarUrl} label={displayName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-800">{displayName}</p>
              <p className="truncate text-xs text-gray-500">{smartWalletAddress ?? 'Wallet not available'}</p>
            </div>
          </div>
        </Section>

        <Section title="Amount">
          <div className="flex items-center gap-2 px-4 pb-4 pt-2">
            <span className="text-sm font-semibold text-gray-500">USD</span>
            <input
              type="text"
              inputMode="decimal"
              value={monto}
              onChange={(event) => setMonto(event.target.value.replace(/[^0-9.]/g, ''))}
              onBlur={() => setMonto(formatAmount(monto))}
              className="w-full bg-transparent text-3xl font-bold outline-none"
              placeholder="0.00"
            />
          </div>
        </Section>

        <div>
          <h3 className="mb-2 mt-2 text-sm font-medium text-gray-500">Suggested value</h3>
          <div className="grid grid-cols-3 gap-3">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setMonto(suggestion.toFixed(2))}
                className={`rounded-xl border py-3 text-center font-semibold ${
                  amountNumber === suggestion
                    ? 'border-[#6B39F4] bg-[#6B39F4] text-white'
                    : 'border-white/25 bg-white/20 text-gray-700'
                }`}
              >
                ${suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={async () => {
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
            clearPendingInvestment();
            setPendingInvestment(null);
          }
          if (transferMode === 'repayment' && !pendingInvestment) {
            router.replace('/invest/repayments');
            return;
          }
          setMonto('');
          setWalletDestino('');
        }}
        disabled={!canSubmit || loadingTx}
        className={`fixed bottom-[6.1rem] left-1/2 z-[70] w-[calc(100%-2.5rem)] max-w-[24rem] -translate-x-1/2 rounded-2xl py-4 font-semibold text-white shadow-[0_18px_38px_rgba(107,57,244,0.24)] ${
          !canSubmit || loadingTx ? 'bg-[#6B39F4]/40' : 'bg-[#6B39F4]'
        }`}
      >
        {loadingTx ? 'Processing...' : submitLabel}
      </button>
    </PageFrame>
  );
}
