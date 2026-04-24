'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import BottomNav from '@/components/BottomNav';
import { useInvestApp } from '@/lib/investapp-context';
import { useUserProfileSummary } from '@/lib/use-user-profile-summary';
import { HOME_REFRESH_INTERVAL_MS } from '@/lib/project-status';
import { fetchCurrentUserTransactions } from '@/utils/client/current-user-transactions';
import type {
  CurrentUserTransaction,
  TransactionMovementType,
  TransactionStatus,
} from '@/utils/transactions/current-user';

type TransactionDirection = 'incoming' | 'outgoing' | 'neutral';
type MovementFilter = 'all' | TransactionMovementType;
type StatusFilter = 'all' | TransactionStatus;
type DirectionFilter = 'all' | Exclude<TransactionDirection, 'neutral'>;
type SortFilter = 'latest' | 'oldest' | 'highest' | 'lowest';

type TransactionRow = CurrentUserTransaction;

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

  const dateLabel = date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeLabel = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateLabel} at ${timeLabel}`;
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
  return 'border-[#E4E7EF] bg-[#F8F9FC] text-[#818898]';
};

const getDirectionLabel = (direction: TransactionDirection) => {
  if (direction === 'incoming') return 'Incoming';
  if (direction === 'outgoing') return 'Outgoing';
  return 'Internal';
};

const sumTransactionAmounts = (transactions: TransactionRow[]) =>
  transactions.reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);

const initialsFrom = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';

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

function IconDocument() {
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
      <path d="M8 3.5h6l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

function IconChartBars() {
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
      <path d="M6 18V9" />
      <path d="M12 18V5" />
      <path d="M18 18v-7" />
    </svg>
  );
}

function IconArrowDown() {
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
      <path d="m6.5 13.5 5.5 5.5 5.5-5.5" />
    </svg>
  );
}

function IconArrowUp() {
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
      <path d="M12 19V5" />
      <path d="M6.5 10.5 12 5l5.5 5.5" />
    </svg>
  );
}

function IconTrendUp() {
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
      <path d="m5 15 4-4 3 3 6-6" />
      <path d="M15 8h3v3" />
    </svg>
  );
}

function IconSearch() {
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
      <path d="M16.7 16.7A7 7 0 1 0 6.8 6.8a7 7 0 0 0 9.9 9.9Z" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconTag() {
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
      <path d="m20 13-7 7-9-9V4h7Z" />
      <path d="M8.5 8.5h.01" />
    </svg>
  );
}

function IconShield() {
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
      <path d="M12 3c2 1.4 4.1 2.4 6.7 3a1.2 1.2 0 0 1 .9 1.2c-.3 5.7-2.4 10.8-7.6 12.8-5.2-2-7.3-7.1-7.6-12.8A1.2 1.2 0 0 1 5.3 6C7.9 5.4 10 4.4 12 3Z" />
    </svg>
  );
}

function IconSort() {
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
      <path d="M8 6v12" />
      <path d="m5.5 8.5 2.5-2.5 2.5 2.5" />
      <path d="M16 18V6" />
      <path d="m13.5 15.5 2.5 2.5 2.5-2.5" />
    </svg>
  );
}

function IconChevronDown() {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconCopy() {
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
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck() {
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
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, rolSeleccionado, smartWalletAddress, lastReceipt } = useInvestApp();
  const { avatarUrl, displayName: profileName } = useUserProfileSummary();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const [movementFilter, setMovementFilter] = useState<MovementFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [sortBy, setSortBy] = useState<SortFilter>('latest');
  const [copiedTransactionId, setCopiedTransactionId] = useState<string | null>(null);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const run = async () => {
      if (!user?.id) {
        setTransactions([]);
        setLoading(false);
        setStatusMessage('');
        return;
      }

      setLoading(true);
      setStatusMessage('');

      const { data, error } = await fetchCurrentUserTransactions(getAccessToken, {
        limit: 200,
        wallet: smartWalletAddress ?? undefined,
      });

      if (error) {
        setTransactions([]);
        setStatusMessage(`Could not load your transaction history: ${error}`);
        setLoading(false);
        return;
      }

      setTransactions(data ?? []);
      setLoading(false);
    };

    void run();
    const interval = window.setInterval(() => {
      void run();
    }, HOME_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [getAccessToken, user?.id, smartWalletAddress, lastReceipt?.txHash]);

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
      const matchesDirection = directionFilter === 'all' || direction === directionFilter;

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

  const handleCopy = async (transaction: TransactionRow) => {
    const valueToCopy = transaction.tx_hash ?? String(transaction.id);
    if (!valueToCopy) return;

    try {
      await navigator.clipboard.writeText(valueToCopy);
      setCopiedTransactionId(transaction.id);
      window.setTimeout(() => {
        setCopiedTransactionId((current) => (current === transaction.id ? null : current));
      }, 1400);
    } catch {
      setStatusMessage('We could not copy the transaction hash right now.');
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.12),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_52%,#F8F9FD_100%)] pb-36 text-[#101828]">
      <div className="pointer-events-none absolute left-1/2 top-[-9rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-56 h-64 w-64 rounded-full bg-[#B9A8FF]/16 blur-3xl" />

      <div className="relative mx-auto w-full max-w-xl px-4 pb-10 pt-10 sm:px-5">
        <header className="mb-7 flex items-start justify-between gap-4 px-1">
          <div className="min-w-0">
            <div className="flex items-center gap-0.5 text-[2rem] font-semibold tracking-[-0.07em] text-[#1C2336]">
              <span>Invest</span>
              <span className="text-[#6B39F4]">App</span>
              <span className="ml-0.5 mt-0.5 h-3 w-3 rounded-full bg-[#6B39F4]" />
            </div>
            <p className="mt-7 text-[0.74rem] font-semibold uppercase tracking-[0.28em] text-[#9AA3B6]">
              INVESTAPP
            </p>
            <h1 className="mt-2 text-[2.6rem] font-semibold tracking-[-0.075em] text-[#121A31]">
              Transaction history
            </h1>
            <p className="mt-1 max-w-[34rem] text-[1.05rem] font-medium tracking-[-0.025em] text-[#7A8497]">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            aria-label="Open menu"
            onClick={() => router.push('/profile/settings')}
            className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/90 bg-white/86 text-[#6B39F4] shadow-[0_18px_36px_rgba(31,38,64,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white"
          >
            <IconMenu />
          </button>
        </header>

        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-3">
            <div className="rounded-[30px] border border-white/85 bg-white/88 p-5 shadow-[0_22px_58px_rgba(31,38,64,0.08)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[#F4F0FF] text-[#6B39F4]">
                    <IconDocument />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-[#8A93A6]">
                      Transactions
                    </p>
                    <p className="mt-3 text-[2.45rem] font-semibold leading-none tracking-[-0.07em] text-[#121A31]">
                      {filteredTransactions.length}
                    </p>
                    <p className="mt-3 text-[0.88rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                      Loaded from your complete recent history.
                    </p>
                  </div>
                </div>
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[#F6F1FF] text-[#7A59FF]">
                  <IconChartBars />
                </span>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/85 bg-white/88 p-5 shadow-[0_22px_58px_rgba(31,38,64,0.08)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[#ECFBF4] text-[#32A27E]">
                    <IconArrowDown />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-[#8A93A6]">
                      Incoming
                    </p>
                    <p className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.07em] text-[#27906E]">
                      {formatTransactionAmount(sumTransactionAmounts(incomingTransactions))}
                    </p>
                    <p className="mt-3 text-[0.88rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                      {incomingTransactions.length} movements
                    </p>
                  </div>
                </div>
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[#ECFBF4] text-[#32A27E]">
                  <IconTrendUp />
                </span>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/85 bg-white/88 p-5 shadow-[0_22px_58px_rgba(31,38,64,0.08)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[#FFF1F3] text-[#C93D58]">
                    <IconArrowUp />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-[#8A93A6]">
                      Outgoing
                    </p>
                    <p className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.07em] text-[#C42847]">
                      {formatTransactionAmount(sumTransactionAmounts(outgoingTransactions))}
                    </p>
                    <p className="mt-3 text-[0.88rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                      {outgoingTransactions.length} movements
                    </p>
                  </div>
                </div>
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[#FFF1F3] text-[#C93D58]">
                  <IconTrendUp />
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-white/85 bg-white/88 p-5 shadow-[0_22px_58px_rgba(31,38,64,0.08)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[1.35rem] font-semibold tracking-[-0.055em] text-[#121A31]">
                  Filters
                </h2>
                <p className="mt-1 text-[0.92rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                  Search by hash, transaction ID or wallet.
                </p>
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
                  className="rounded-full border border-[#D7C8FF] bg-[#FBF9FF] px-4 py-2 text-[0.8rem] font-semibold tracking-[-0.02em] text-[#6B39F4] transition hover:bg-[#F6F1FF]"
                >
                  Clear filters
                </button>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-[22px] border border-[#EEF0F8] bg-[linear-gradient(180deg,#FAF9FF_0%,#F6F4FF_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <span className="text-[#8A93A6]">
                  <IconSearch />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by tx hash, wallet or ID"
                  className="w-full bg-transparent text-[0.98rem] font-medium tracking-[-0.02em] text-[#17203A] outline-none placeholder:text-[#99A3B6]"
                />
              </div>

              <div className="space-y-2.5">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#6B39F4]">
                    <IconTag />
                  </span>
                  <select
                    value={movementFilter}
                    onChange={(event) => setMovementFilter(event.target.value as MovementFilter)}
                    className="w-full appearance-none rounded-[22px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] py-4 pl-14 pr-12 text-[1rem] font-medium tracking-[-0.02em] text-[#17203A] outline-none shadow-[0_12px_24px_rgba(31,38,64,0.04)] transition focus:border-[#D7C8FF] focus:ring-4 focus:ring-[#6B39F4]/10"
                  >
                    {movementTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7F899D]">
                    <IconChevronDown />
                  </span>
                </div>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#6B39F4]">
                    <IconShield />
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    className="w-full appearance-none rounded-[22px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] py-4 pl-14 pr-12 text-[1rem] font-medium tracking-[-0.02em] text-[#17203A] outline-none shadow-[0_12px_24px_rgba(31,38,64,0.04)] transition focus:border-[#D7C8FF] focus:ring-4 focus:ring-[#6B39F4]/10"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7F899D]">
                    <IconChevronDown />
                  </span>
                </div>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#6B39F4]">
                    <IconSort />
                  </span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortFilter)}
                    className="w-full appearance-none rounded-[22px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] py-4 pl-14 pr-12 text-[1rem] font-medium tracking-[-0.02em] text-[#17203A] outline-none shadow-[0_12px_24px_rgba(31,38,64,0.04)] transition focus:border-[#D7C8FF] focus:ring-4 focus:ring-[#6B39F4]/10"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7F899D]">
                    <IconChevronDown />
                  </span>
                </div>
              </div>

              <div className="rounded-full bg-[#F6F4FF] p-1">
                <div className="grid grid-cols-3 gap-1">
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
                        className={`rounded-full px-3 py-2.5 text-[0.84rem] font-semibold tracking-[-0.02em] transition ${
                          active
                            ? 'bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] text-white shadow-[0_14px_26px_rgba(107,57,244,0.22)]'
                            : 'text-[#727B8E]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {loading ? (
            <div className="rounded-[26px] border border-white/85 bg-white/88 px-5 py-5 text-[0.95rem] font-medium text-[#8A93A6] shadow-[0_18px_46px_rgba(31,38,64,0.08)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-xl">
              Loading transaction history...
            </div>
          ) : null}

          {statusMessage ? (
            <div className="rounded-[26px] border border-[#F5C8D1] bg-[#FFF3F6] px-5 py-4 text-[0.95rem] font-medium tracking-[-0.02em] text-[#C42847] shadow-[0_18px_46px_rgba(31,38,64,0.08)]">
              {statusMessage}
            </div>
          ) : null}

          {!loading && !statusMessage && transactions.length === 0 ? (
            <div className="rounded-[26px] border border-white/85 bg-white/88 px-5 py-5 text-[0.95rem] font-medium text-[#8A93A6] shadow-[0_18px_46px_rgba(31,38,64,0.08)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-xl">
              Your activity will appear here once you start moving funds through the app.
            </div>
          ) : null}

          {!loading && !statusMessage && transactions.length > 0 && filteredTransactions.length === 0 ? (
            <div className="rounded-[26px] border border-white/85 bg-white/88 px-5 py-5 text-[0.95rem] font-medium text-[#8A93A6] shadow-[0_18px_46px_rgba(31,38,64,0.08)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-xl">
              No transactions match the current filters.
            </div>
          ) : null}

          <div className="space-y-3">
            {filteredTransactions.map((transaction) => {
              const direction = getTransactionDirection(transaction, smartWalletAddress);
              const incoming = direction === 'incoming';
              const outgoing = direction === 'outgoing';
              const amountColor = incoming
                ? 'text-[#1A8E78]'
                : outgoing
                  ? 'text-[#C42847]'
                  : 'text-[#475569]';
              const amountPrefix = incoming ? '+' : outgoing ? '-' : '';
              const currentWallet = smartWalletAddress?.toLowerCase();
              const isCurrentSender = transaction.from_wallet?.toLowerCase() === currentWallet;
              const senderDisplayName = isCurrentSender
                ? profileName || 'Current wallet'
                : shortenIdentifier(transaction.from_wallet, 5);
              const senderAvatarUrl = isCurrentSender ? avatarUrl : null;
              const senderWallet = shortenIdentifier(transaction.from_wallet, 6);
              const copyActive = copiedTransactionId === transaction.id;

              return (
                <button
                  key={transaction.id}
                  type="button"
                  onClick={() =>
                    setSearchQuery(transaction.tx_hash ?? transaction.from_wallet ?? String(transaction.id))
                  }
                  className="w-full rounded-[30px] border border-white/85 bg-white/88 p-5 text-left shadow-[0_22px_58px_rgba(31,38,64,0.08)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl transition hover:-translate-y-0.5 active:scale-[0.995]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3.5">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                          incoming
                            ? 'bg-[#ECFBF4] text-[#32A27E]'
                            : outgoing
                              ? 'bg-[#FFF1F3] text-[#C93D58]'
                              : 'bg-[#F4F0FF] text-[#6B39F4]'
                        }`}
                      >
                        {incoming ? <IconArrowDown /> : outgoing ? <IconArrowUp /> : <IconDocument />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <p className="text-[1rem] font-semibold tracking-[-0.04em] text-[#121A31]">
                            {getTransactionTitle(transaction, smartWalletAddress)}
                          </p>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold tracking-[-0.01em] ${getStatusTone(transaction.status)}`}
                          >
                            {getStatusLabel(transaction.status)}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold tracking-[-0.01em] ${getDirectionTone(direction)}`}
                          >
                            {getDirectionLabel(direction)}
                          </span>
                        </div>

                        <p className="mt-2 text-[0.86rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                          {getMovementTypeLabel(transaction.movement_type)} ·{' '}
                          {formatDateTime(transaction.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className={`text-[1rem] font-semibold tracking-[-0.04em] ${amountColor}`}>
                        {amountPrefix}
                        {formatTransactionAmount(transaction.amount)}
                      </p>
                    </div>
                  </div>

                  <div className="my-4 h-px bg-[#E8EAF4]" />

                  <div className="space-y-4">
                    <div>
                      <p className="text-[0.82rem] font-semibold tracking-[-0.02em] text-[#121A31]">
                        Hash
                      </p>
                      <p className="mt-1 text-[0.95rem] font-medium tracking-[-0.02em] text-[#77819A]">
                        {transaction.tx_hash
                          ? shortenIdentifier(transaction.tx_hash, 8)
                          : 'Not available'}
                      </p>
                    </div>

                    <div className="flex items-end justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3.5">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-[2px] border-white bg-[#F4F0FF] shadow-[0_12px_24px_rgba(31,38,64,0.08)]">
                          {senderAvatarUrl ? (
                            <span
                              className="block h-full w-full bg-cover bg-center"
                              style={{ backgroundImage: `url(${senderAvatarUrl})` }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#6B39F4]">
                              {initialsFrom(senderDisplayName)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-[0.82rem] font-semibold tracking-[-0.02em] text-[#121A31]">
                            From
                          </p>
                          <p className="mt-2 truncate text-[1rem] font-semibold tracking-[-0.04em] text-[#121A31]">
                            {senderDisplayName}
                          </p>
                          <p className="mt-1 truncate text-[0.92rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                            {senderWallet}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleCopy(transaction);
                        }}
                        aria-label={copyActive ? 'Copied transaction hash' : 'Copy transaction hash'}
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] transition ${
                          copyActive
                            ? 'bg-[#F4F0FF] text-[#6B39F4]'
                            : 'bg-[#F7F5FF] text-[#7A59FF] hover:bg-[#F1ECFF]'
                        }`}
                      >
                        {copyActive ? <IconCheck /> : <IconCopy />}
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
