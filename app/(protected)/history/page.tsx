'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import Input from '@/components/Input';
import PageFrame from '@/components/PageFrame';
import { useInvestApp } from '@/lib/investapp-context';
import { HOME_REFRESH_INTERVAL_MS } from '@/lib/project-status';
import { getAmountValue, runWithAmountColumnFallback } from '@/lib/supabase-amount';
import {
  detectTransactionsSchema,
  loadLegacyTransactionsForUser,
} from '@/lib/supabase-ledger-compat';

type TransactionMovementType = 'investment' | 'repayment' | 'transfer' | 'buy' | 'withdrawal';
type TransactionStatus = 'submitted' | 'confirmed' | 'failed';
type TransactionDirection = 'incoming' | 'outgoing' | 'neutral';
type MovementFilter = 'all' | TransactionMovementType;
type StatusFilter = 'all' | TransactionStatus;
type DirectionFilter = 'all' | Exclude<TransactionDirection, 'neutral'>;
type SortFilter = 'latest' | 'oldest' | 'highest' | 'lowest';

type TransactionRow = {
  id: string;
  created_at: string;
  movement_type: TransactionMovementType;
  status: TransactionStatus;
  from_wallet: string | null;
  to_wallet: string | null;
  tx_hash: string | null;
  amount: number | null;
};

type RawTransactionRow = Omit<TransactionRow, 'amount'> & {
  amount?: number | null;
  amount_usdc?: number | null;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const movementTypeOptions: Array<{ value: MovementFilter; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'investment', label: 'Investments' },
  { value: 'repayment', label: 'Repayments' },
  { value: 'transfer', label: 'Transfers' },
  { value: 'buy', label: 'Top ups' },
  { value: 'withdrawal', label: 'Withdrawals' },
];

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'submitted', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

const sortOptions: Array<{ value: SortFilter; label: string }> = [
  { value: 'latest', label: 'Latest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest amount' },
  { value: 'lowest', label: 'Lowest amount' },
];

const normalizeSearchQuery = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const formatTransactionAmount = (amount: number | null) => {
  if (amount == null) return '0.00 USDC';
  return `${Number(amount).toFixed(2)} USDC`;
};

const shortenIdentifier = (value: string | null | undefined, size = 6) => {
  if (!value) return '--';
  if (value.length <= size * 2) return value;
  return `${value.slice(0, size)}...${value.slice(-size)}`;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTransactionDirection = (
  transaction: Pick<TransactionRow, 'movement_type' | 'from_wallet' | 'to_wallet'>,
  walletAddress?: string | null
): TransactionDirection => {
  if (transaction.movement_type === 'buy') return 'incoming';
  if (transaction.movement_type === 'withdrawal') return 'outgoing';

  const currentWallet = walletAddress?.toLowerCase();
  const fromWallet = transaction.from_wallet?.toLowerCase();
  const toWallet = transaction.to_wallet?.toLowerCase();

  if (!currentWallet) return 'neutral';
  if (toWallet === currentWallet && fromWallet !== currentWallet) return 'incoming';
  if (fromWallet === currentWallet && toWallet !== currentWallet) return 'outgoing';
  return 'neutral';
};

const getMovementTypeLabel = (movementType: TransactionMovementType) => {
  switch (movementType) {
    case 'investment':
      return 'Investment';
    case 'repayment':
      return 'Repayment';
    case 'transfer':
      return 'Transfer';
    case 'buy':
      return 'Top up';
    case 'withdrawal':
      return 'Withdrawal';
    default:
      return 'Movement';
  }
};

const getTransactionTitle = (transaction: TransactionRow, walletAddress?: string | null) => {
  const direction = getTransactionDirection(transaction, walletAddress);

  if (transaction.movement_type === 'buy') return 'Top up received';
  if (transaction.movement_type === 'withdrawal') return 'Withdrawal sent';
  if (transaction.movement_type === 'investment') {
    if (direction === 'incoming') return 'Investment received';
    if (direction === 'outgoing') return 'Investment sent';
    return 'Investment movement';
  }
  if (transaction.movement_type === 'repayment') {
    if (direction === 'incoming') return 'Repayment received';
    if (direction === 'outgoing') return 'Repayment sent';
    return 'Repayment movement';
  }
  if (direction === 'incoming') return 'Transfer received';
  if (direction === 'outgoing') return 'Transfer sent';
  return 'Transfer movement';
};

const getStatusTone = (status: TransactionStatus) => {
  if (status === 'confirmed') return 'border-[#40C4AA]/35 bg-[#EFFEFA] text-[#1A8E78]';
  if (status === 'failed') return 'border-[#DF1C41]/20 bg-[#FFF1F3] text-[#C42847]';
  return 'border-[#FFBE4C]/35 bg-[#FFF7E6] text-[#C77C00]';
};

const getStatusLabel = (status: TransactionStatus) => {
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'failed') return 'Failed';
  return 'Pending';
};

const getDirectionTone = (direction: TransactionDirection) => {
  if (direction === 'incoming') return 'border-[#40C4AA]/30 bg-[#EFFEFA] text-[#1A8E78]';
  if (direction === 'outgoing') return 'border-[#DF1C41]/20 bg-[#FFF1F3] text-[#C42847]';
  return 'border-white/25 bg-white/60 text-[#818898]';
};

const getDirectionLabel = (direction: TransactionDirection) => {
  if (direction === 'incoming') return 'Incoming';
  if (direction === 'outgoing') return 'Outgoing';
  return 'Internal';
};

const sumTransactionAmounts = (transactions: TransactionRow[]) =>
  transactions.reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);

async function loadTransactionsForHistory({
  supabase,
  userId,
  smartWalletAddress,
  limit,
}: {
  supabase: SupabaseClient;
  userId?: string | null;
  smartWalletAddress?: string | null;
  limit: number;
}): Promise<{ data: TransactionRow[]; error: PostgrestError | null }> {
  if (!userId && !smartWalletAddress) {
    return { data: [], error: null };
  }

  const transactionSchema = await detectTransactionsSchema(supabase);

  if (transactionSchema === 'legacy') {
    if (!userId) {
      return { data: [], error: null };
    }

    const { data, error } = await loadLegacyTransactionsForUser(supabase, userId, limit);
    if (error) {
      return { data: [], error };
    }

    return {
      data: data.map((transaction) => ({
        id: transaction.id,
        created_at: transaction.created_at,
        movement_type: transaction.movement_type as TransactionMovementType,
        status: transaction.status,
        from_wallet: transaction.from_wallet,
        to_wallet: transaction.to_wallet,
        tx_hash: transaction.tx_hash,
        amount: transaction.amount,
      })),
      error: null,
    };
  }

  const filters = [userId ? `user_id.eq.${userId}` : null];
  if (smartWalletAddress) {
    filters.push(`from_wallet.eq.${smartWalletAddress}`);
    filters.push(`to_wallet.eq.${smartWalletAddress}`);
  }

  const { data, error } = await runWithAmountColumnFallback((amountColumn) =>
    supabase
      .from('transactions')
      .select(`id,created_at,movement_type,status,from_wallet,to_wallet,tx_hash,${amountColumn}`)
      .or(filters.filter(Boolean).join(','))
      .order('created_at', { ascending: false })
      .limit(limit)
  );

  if (error) {
    return { data: [], error };
  }

  return {
    data: ((data ?? []) as RawTransactionRow[])
      .filter((transaction) => transaction.id)
      .map((transaction) => ({
        ...transaction,
        amount: getAmountValue(transaction),
      })) as TransactionRow[],
    error: null,
  };
}

export default function HistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, rolSeleccionado, smartWalletAddress, lastReceipt } = useInvestApp();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const [movementFilter, setMovementFilter] = useState<MovementFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [sortBy, setSortBy] = useState<SortFilter>('latest');

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
        raw.includes('no suitable key') ||
        raw.includes('wrong key type') ||
        raw.includes('invalid jwt');
      if (!shouldFallback) return response;
      return run(baseHeaders);
    };

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: authedFetch },
    });
  }, [getAccessToken]);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setStatusMessage('');

      const { data, error } = await loadTransactionsForHistory({
        supabase,
        userId: user?.id,
        smartWalletAddress,
        limit: 200,
      });

      if (error) {
        setTransactions([]);
        setStatusMessage(`Could not load your transaction history: ${error.message}`);
        setLoading(false);
        return;
      }

      setTransactions(data);
      setLoading(false);
    };

    void run();
    const interval = window.setInterval(() => {
      void run();
    }, HOME_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [supabase, user?.id, smartWalletAddress, lastReceipt?.txHash]);

  const normalizedSearchQuery = useMemo(() => normalizeSearchQuery(searchQuery), [searchQuery]);

  const filteredTransactions = useMemo(() => {
    const next = transactions.filter((transaction) => {
      const direction = getTransactionDirection(transaction, smartWalletAddress);
      const matchesSearch =
        normalizedSearchQuery.length === 0 ||
        [
          transaction.id,
          transaction.tx_hash,
          transaction.from_wallet,
          transaction.to_wallet,
          transaction.movement_type,
          transaction.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearchQuery));

      const matchesMovement =
        movementFilter === 'all' || transaction.movement_type === movementFilter;
      const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
      const matchesDirection =
        directionFilter === 'all' || direction === directionFilter;

      return matchesSearch && matchesMovement && matchesStatus && matchesDirection;
    });

    next.sort((left, right) => {
      if (sortBy === 'oldest') {
        return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      }
      if (sortBy === 'highest') {
        return Number(right.amount ?? 0) - Number(left.amount ?? 0);
      }
      if (sortBy === 'lowest') {
        return Number(left.amount ?? 0) - Number(right.amount ?? 0);
      }
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });

    return next;
  }, [
    transactions,
    smartWalletAddress,
    normalizedSearchQuery,
    movementFilter,
    statusFilter,
    directionFilter,
    sortBy,
  ]);

  const incomingTransactions = useMemo(
    () =>
      filteredTransactions.filter(
        (transaction) => getTransactionDirection(transaction, smartWalletAddress) === 'incoming'
      ),
    [filteredTransactions, smartWalletAddress]
  );

  const outgoingTransactions = useMemo(
    () =>
      filteredTransactions.filter(
        (transaction) => getTransactionDirection(transaction, smartWalletAddress) === 'outgoing'
      ),
    [filteredTransactions, smartWalletAddress]
  );

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    movementFilter !== 'all' ||
    statusFilter !== 'all' ||
    directionFilter !== 'all' ||
    sortBy !== 'latest';

  const subtitle =
    rolSeleccionado === 'emprendedor'
      ? 'Review all incoming and outgoing venture movements'
      : 'Review all wallet, investment and repayment movements';

  return (
    <PageFrame title="Transaction history" subtitle={subtitle}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[20px] border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#818898]">
              Transactions
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{filteredTransactions.length}</p>
            <p className="mt-1 text-xs text-[#818898]">Loaded from your complete recent history.</p>
          </div>

          <div className="rounded-[20px] border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#818898]">
              Incoming
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#1A8E78]">
              {formatTransactionAmount(sumTransactionAmounts(incomingTransactions))}
            </p>
            <p className="mt-1 text-xs text-[#818898]">{incomingTransactions.length} movements</p>
          </div>

          <div className="rounded-[20px] border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#818898]">
              Outgoing
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#C42847]">
              {formatTransactionAmount(sumTransactionAmounts(outgoingTransactions))}
            </p>
            <p className="mt-1 text-xs text-[#818898]">{outgoingTransactions.length} movements</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#0F172A]">Filters</h2>
              <p className="text-xs text-[#818898]">Search by hash, transaction ID or wallet.</p>
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setMovementFilter('all');
                  setStatusFilter('all');
                  setDirectionFilter('all');
                  setSortBy('latest');
                }}
                className="rounded-full border border-[#D3C4FC] px-4 py-2 text-xs font-semibold text-[#6B39F4]"
              >
                Clear filters
              </button>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            <Input
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by tx hash, wallet or ID"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={movementFilter}
                onChange={(event) => setMovementFilter(event.target.value as MovementFilter)}
                className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-2 text-sm text-gray-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              >
                {movementTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-2 text-sm text-gray-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortFilter)}
                className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-2 text-sm text-gray-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap gap-2 rounded-[18px] border border-white/25 bg-white/10 p-2">
                {(['all', 'incoming', 'outgoing'] as const).map((option) => {
                  const active = directionFilter === option;
                  const label =
                    option === 'all'
                      ? 'All directions'
                      : option === 'incoming'
                        ? 'Incoming'
                        : 'Outgoing';

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDirectionFilter(option)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        active
                          ? 'bg-[#6B39F4] text-white'
                          : 'bg-white/70 text-[#666D80]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[20px] border border-white/25 bg-white/20 px-4 py-5 text-sm text-[#818898] backdrop-blur-md">
            Loading transaction history...
          </div>
        ) : null}

        {statusMessage ? (
          <div className="rounded-[20px] border border-[#DF1C41]/15 bg-[#FFF1F3] px-4 py-4 text-sm text-[#C42847]">
            {statusMessage}
          </div>
        ) : null}

        {!loading && !statusMessage && transactions.length === 0 ? (
          <div className="rounded-[20px] border border-white/25 bg-white/20 px-4 py-5 text-sm text-[#818898] backdrop-blur-md">
            Your activity will appear here once you start moving funds through the app.
          </div>
        ) : null}

        {!loading && !statusMessage && transactions.length > 0 && filteredTransactions.length === 0 ? (
          <div className="rounded-[20px] border border-white/25 bg-white/20 px-4 py-5 text-sm text-[#818898] backdrop-blur-md">
            No transactions match the current filters.
          </div>
        ) : null}

        <div className="space-y-3">
          {filteredTransactions.map((transaction) => {
            const direction = getTransactionDirection(transaction, smartWalletAddress);
            const incoming = direction === 'incoming';
            const amountColor =
              direction === 'incoming'
                ? 'text-[#1A8E78]'
                : direction === 'outgoing'
                  ? 'text-[#C42847]'
                  : 'text-[#475569]';
            const amountPrefix = incoming ? '+' : direction === 'outgoing' ? '-' : '';

            return (
              <article
                key={transaction.id}
                className="rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {getTransactionTitle(transaction, smartWalletAddress)}
                      </p>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusTone(transaction.status)}`}
                      >
                        {getStatusLabel(transaction.status)}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getDirectionTone(direction)}`}
                      >
                        {getDirectionLabel(direction)}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-[#818898]">
                      {getMovementTypeLabel(transaction.movement_type)} · {formatDateTime(transaction.created_at)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className={`text-sm font-semibold ${amountColor}`}>
                      {amountPrefix}
                      {formatTransactionAmount(transaction.amount)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-[#666D80] sm:grid-cols-3">
                  <div className="rounded-[16px] bg-white/60 px-3 py-2">
                    <p className="font-semibold text-[#0F172A]">Hash</p>
                    <p className="mt-1 truncate">
                      {transaction.tx_hash ? shortenIdentifier(transaction.tx_hash, 8) : 'Not available'}
                    </p>
                  </div>

                  <div className="rounded-[16px] bg-white/60 px-3 py-2">
                    <p className="font-semibold text-[#0F172A]">From</p>
                    <p className="mt-1 truncate">{shortenIdentifier(transaction.from_wallet, 8)}</p>
                  </div>

                  <div className="rounded-[16px] bg-white/60 px-3 py-2">
                    <p className="font-semibold text-[#0F172A]">To</p>
                    <p className="mt-1 truncate">{shortenIdentifier(transaction.to_wallet, 8)}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </PageFrame>
  );
}
