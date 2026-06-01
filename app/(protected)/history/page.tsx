'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useLocale, useTranslations } from 'next-intl';
import BottomNav from '@/components/BottomNav';
import { SectionLoadingSkeleton } from '@/components/AppLoadingSkeleton';
import { AppCombobox } from '@/components/tailgrids/core/app-combobox';
import { Avatar } from '@/components/tailgrids/core/avatar';
import { Button } from '@/components/tailgrids/core/button';
import {
  DesktopAppShell,
  DesktopEmptyState,
  DesktopMetricCard,
  DesktopSectionCard,
} from '@/components/DesktopAppShell';
import { useInvestApp } from '@/lib/investapp-context';
import { useUserProfileSummary } from '@/lib/use-user-profile-summary';
import { HOME_REFRESH_INTERVAL_MS } from '@/lib/project-status';
import { fetchCurrentUserTransactions } from '@/utils/client/current-user-transactions';
import { fetchRecipientDirectory } from '@/utils/client/recipient-directory';
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

type DirectoryProfile = {
  name: string | null;
  surname: string | null;
  email: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
};

const movementTypeOptions: Array<{ value: MovementFilter; labelKey: string }> = [
  { value: 'all', labelKey: 'allTypes' },
  { value: 'investment', labelKey: 'investments' },
  { value: 'repayment', labelKey: 'repayments' },
  { value: 'transfer', labelKey: 'transfers' },
  { value: 'buy', labelKey: 'topUps' },
  { value: 'withdrawal', labelKey: 'withdrawals' },
];

const statusOptions: Array<{ value: StatusFilter; labelKey: string }> = [
  { value: 'all', labelKey: 'allStatuses' },
  { value: 'confirmed', labelKey: 'confirmed' },
  { value: 'submitted', labelKey: 'pending' },
  { value: 'failed', labelKey: 'failed' },
];

const sortOptions: Array<{ value: SortFilter; labelKey: string }> = [
  { value: 'latest', labelKey: 'latestFirst' },
  { value: 'oldest', labelKey: 'oldestFirst' },
  { value: 'highest', labelKey: 'highestAmount' },
  { value: 'lowest', labelKey: 'lowestAmount' },
];

const normalizeSearchQuery = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const formatTransactionAmount = (amount: number | null) => {
  if (amount == null) return '0.00 USD';
  return `${Number(amount).toFixed(2)} USD`;
};

const shortenIdentifier = (value: string | null | undefined, size = 6) => {
  if (!value) return '--';
  if (value.length <= size * 2) return value;
  return `${value.slice(0, size)}...${value.slice(-size)}`;
};

const formatDateTime = (value: string, locale: string, justNowLabel: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return justNowLabel;

  const dateLabel = date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeLabel = date.toLocaleTimeString(locale, {
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

const getMovementTypeLabelKey = (movementType: TransactionMovementType) => {
  switch (movementType) {
    case 'investment':
      return 'investment';
    case 'repayment':
      return 'repayment';
    case 'transfer':
      return 'transfer';
    case 'buy':
      return 'topUp';
    case 'withdrawal':
      return 'withdrawal';
    default:
      return 'movement';
  }
};

const getTransactionTitleKey = (transaction: TransactionRow, walletAddress?: string | null) => {
  const direction = getTransactionDirection(transaction, walletAddress);

  if (transaction.movement_type === 'buy') return 'topUpReceived';
  if (transaction.movement_type === 'withdrawal') return 'withdrawalSent';
  if (transaction.movement_type === 'investment') {
    if (direction === 'incoming') return 'investmentReceived';
    if (direction === 'outgoing') return 'investmentSent';
    return 'investmentMovement';
  }
  if (transaction.movement_type === 'repayment') {
    if (direction === 'incoming') return 'repaymentReceived';
    if (direction === 'outgoing') return 'repaymentSent';
    return 'repaymentMovement';
  }
  if (direction === 'incoming') return 'transferReceived';
  if (direction === 'outgoing') return 'transferSent';
  return 'transferMovement';
};

const getStatusTone = (status: TransactionStatus) => {
  if (status === 'confirmed') return 'border-[#40C4AA]/35 bg-[#EFFEFA] text-[#1A8E78]';
  if (status === 'failed') return 'border-[#DF1C41]/20 bg-[#FFF1F3] text-[#C42847]';
  return 'border-[#FFBE4C]/35 bg-[#FFF7E6] text-[#C77C00]';
};

const getStatusLabelKey = (status: TransactionStatus) => {
  if (status === 'confirmed') return 'confirmed';
  if (status === 'failed') return 'failed';
  return 'pending';
};

const getDirectionTone = (direction: TransactionDirection) => {
  if (direction === 'incoming') return 'border-[#40C4AA]/30 bg-[#EFFEFA] text-[#1A8E78]';
  if (direction === 'outgoing') return 'border-[#DF1C41]/20 bg-[#FFF1F3] text-[#C42847]';
  return 'border-[#E4E7EF] bg-[#F8F9FC] text-[#818898]';
};

const getDirectionLabelKey = (direction: TransactionDirection) => {
  if (direction === 'incoming') return 'incoming';
  if (direction === 'outgoing') return 'outgoing';
  return 'internal';
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

const getDirectoryDisplayName = (profile: DirectoryProfile | null | undefined, fallback: string) => {
  const fullName = `${profile?.name ?? ''} ${profile?.surname ?? ''}`.trim();
  if (fullName) return fullName;
  if (profile?.email?.trim()) return profile.email.trim();
  return fallback;
};

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
  const t = useTranslations('History');
  const tx = (key: string, values?: Record<string, string | number>) => t(key as never, values as never);
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, rolSeleccionado, smartWalletAddress, lastReceipt } = useInvestApp();
  const { avatarUrl, displayName: profileName, email: profileEmail } = useUserProfileSummary();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [directoryProfiles, setDirectoryProfiles] = useState<Record<string, DirectoryProfile>>({});
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
        setStatusMessage(t('loadError', { error }));
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

  useEffect(() => {
    const loadDirectoryProfiles = async () => {
      const uniqueWallets = Array.from(
        new Set(
          transactions
            .flatMap((transaction) => [transaction.from_wallet, transaction.to_wallet])
            .filter((wallet): wallet is string => Boolean(wallet))
        )
      );

      if (uniqueWallets.length === 0) {
        setDirectoryProfiles({});
        return;
      }

      const { data, error } = await fetchRecipientDirectory(getAccessToken, {
        wallets: uniqueWallets,
        limit: uniqueWallets.length,
      });

      if (error) {
        console.error('Error loading directory profiles for history:', error);
        setDirectoryProfiles({});
        return;
      }

      const nextProfiles = ((data ?? []) as DirectoryProfile[]).reduce<Record<string, DirectoryProfile>>(
        (accumulator, profile) => {
          if (profile.wallet_address) {
            accumulator[profile.wallet_address.toLowerCase()] = profile;
          }
          return accumulator;
        },
        {}
      );

      setDirectoryProfiles(nextProfiles);
    };

    void loadDirectoryProfiles();
  }, [getAccessToken, transactions]);

  const normalizedSearchQuery = useMemo(() => normalizeSearchQuery(searchQuery), [searchQuery]);

  const filteredTransactions = useMemo(() => {
    const next = transactions.filter((transaction) => {
      const direction = getTransactionDirection(transaction, smartWalletAddress);
      const fromProfile = transaction.from_wallet
        ? directoryProfiles[transaction.from_wallet.toLowerCase()]
        : undefined;
      const toProfile = transaction.to_wallet
        ? directoryProfiles[transaction.to_wallet.toLowerCase()]
        : undefined;
      const matchesSearch =
        normalizedSearchQuery.length === 0 ||
        [
          transaction.id,
          transaction.tx_hash,
          transaction.from_wallet,
          transaction.to_wallet,
          transaction.movement_type,
          transaction.status,
          fromProfile?.name,
          fromProfile?.surname,
          fromProfile?.email,
          toProfile?.name,
          toProfile?.surname,
          toProfile?.email,
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
    directoryProfiles,
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
      ? t('entrepreneurSubtitle')
      : t('investorSubtitle');

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
      setStatusMessage(t('copyError'));
    }
  };

  return (
    <>
    <DesktopAppShell
      title={t('title')}
      subtitle={subtitle}
      eyebrow={t('eyebrow')}
      searchPlaceholder={t('globalSearchPlaceholder')}
    >
      <section className="grid grid-cols-3 gap-4">
        <DesktopMetricCard
          icon={<IconDocument />}
          label={t('transactions')}
          value={filteredTransactions.length}
          detail={t('loadedFromRecentActivity')}
          tone="purple"
        />
        <DesktopMetricCard
          icon={<IconArrowDown />}
          label={t('incoming')}
          value={formatTransactionAmount(sumTransactionAmounts(incomingTransactions))}
          detail={t('movementsCount', { count: incomingTransactions.length })}
          tone="green"
        />
        <DesktopMetricCard
          icon={<IconArrowUp />}
          label={t('outgoing')}
          value={formatTransactionAmount(sumTransactionAmounts(outgoingTransactions))}
          detail={t('movementsCount', { count: outgoingTransactions.length })}
          tone="rose"
        />
      </section>

      <DesktopSectionCard
        title={t('filters')}
        subtitle={t('filtersSubtitle')}
        action={
          hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setMovementFilter('all');
                setStatusFilter('all');
                setDirectionFilter('all');
                setSortBy('latest');
              }}
              className="h-10 rounded-xl border border-[#D9CCFF] bg-[#F8F5FF] px-4 text-sm font-bold text-[#6B39F4] transition hover:bg-[#F1ECFF]"
            >
              {t('clearFilters')}
            </button>
          ) : null
        }
      >
        <div className="grid grid-cols-[minmax(260px,1.3fr)_repeat(4,minmax(150px,1fr))] gap-3">
          <label className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A93A6]">
              <IconSearch />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('searchHashEmailId')}
              className="h-11 w-full rounded-2xl border border-[#E2E6F0] bg-[#FAFBFF] pl-12 pr-4 text-sm font-semibold text-[#17203A] outline-none transition focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10"
            />
          </label>

          <AppCombobox
            value={movementFilter}
            onChange={(next) => setMovementFilter(next as MovementFilter)}
            options={movementTypeOptions.map((option) => ({
              value: option.value,
              label: tx(option.labelKey),
            }))}
          />

          <AppCombobox
            value={statusFilter}
            onChange={(next) => setStatusFilter(next as StatusFilter)}
            options={statusOptions.map((option) => ({
              value: option.value,
              label: tx(option.labelKey),
            }))}
          />

          <AppCombobox
            value={directionFilter}
            onChange={(next) => setDirectionFilter(next as DirectionFilter)}
            options={[
              { value: 'all', label: t('allDirections') },
              { value: 'incoming', label: t('incoming') },
              { value: 'outgoing', label: t('outgoing') },
            ]}
          />

          <AppCombobox
            value={sortBy}
            onChange={(next) => setSortBy(next as SortFilter)}
            options={sortOptions.map((option) => ({
              value: option.value,
              label: tx(option.labelKey),
            }))}
          />
        </div>
      </DesktopSectionCard>

      <DesktopSectionCard
        title={t('recentMovements')}
        subtitle={t('recentMovementsSubtitle')}
      >
        {loading ? <SectionLoadingSkeleton rows={4} /> : null}
        {statusMessage ? (
          <div className="rounded-2xl border border-[#F5C8D1] bg-[#FFF3F6] px-4 py-3 text-sm font-semibold text-[#C42847]">
            {statusMessage}
          </div>
        ) : null}
        {!loading && !statusMessage && filteredTransactions.length === 0 ? (
          <DesktopEmptyState
            title={t('emptyFilteredTitle')}
            description={t('emptyFilteredDescription')}
          />
        ) : null}
        {!loading && !statusMessage && filteredTransactions.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-[#EEF1F7]">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#F8F9FB] text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#8A95A8]">
                <tr>
                  <th className="px-5 py-4">{t('movement')}</th>
                  <th className="px-5 py-4">{t('direction')}</th>
                  <th className="px-5 py-4">{t('status')}</th>
                  <th className="px-5 py-4">{t('amount')}</th>
                  <th className="px-5 py-4">{t('date')}</th>
                  <th className="px-5 py-4">{t('hash')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F7] bg-white">
                {filteredTransactions.slice(0, 18).map((transaction) => {
                  const direction = getTransactionDirection(transaction, smartWalletAddress);
                  const incoming = direction === 'incoming';
                  const outgoing = direction === 'outgoing';
                  const amountPrefix = incoming ? '+' : outgoing ? '-' : '';
                  const amountColor = incoming
                    ? 'text-[#12895B]'
                    : outgoing
                      ? 'text-[#C42847]'
                      : 'text-[#475569]';
                  return (
                    <tr key={`desktop-${transaction.id}`} className="transition hover:bg-[#FBFCFF]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`grid h-10 w-10 place-items-center rounded-2xl ${
                              incoming
                                ? 'bg-[#E7FBF4] text-[#0B9B72]'
                                : outgoing
                                  ? 'bg-[#FFF1F3] text-[#C73A57]'
                                  : 'bg-[#F1ECFF] text-[#6B39F4]'
                            }`}
                          >
                            {incoming ? <IconArrowDown /> : outgoing ? <IconArrowUp /> : <IconDocument />}
                          </span>
                          <span>
                            <span className="block text-sm font-bold text-[#111827]">
                              {tx(getTransactionTitleKey(transaction, smartWalletAddress))}
                            </span>
                            <span className="mt-1 block text-xs font-medium text-[#73809A]">
                              {tx(getMovementTypeLabelKey(transaction.movement_type))}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getDirectionTone(direction)}`}>
                          {tx(getDirectionLabelKey(direction))}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusTone(transaction.status)}`}>
                          {tx(getStatusLabelKey(transaction.status))}
                        </span>
                      </td>
                      <td className={`px-5 py-4 text-sm font-bold ${amountColor}`}>
                        {amountPrefix}
                        {formatTransactionAmount(transaction.amount)}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-[#66728A]">
                        {formatDateTime(transaction.created_at, locale, t('justNow'))}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => void handleCopy(transaction)}
                          className="rounded-xl bg-[#F5F3FF] px-3 py-2 text-xs font-bold text-[#6B39F4] transition hover:bg-[#EEE8FF]"
                        >
                          {copiedTransactionId === transaction.id
                            ? t('copied')
                            : transaction.tx_hash
                              ? shortenIdentifier(transaction.tx_hash, 7)
                              : t('copy')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </DesktopSectionCard>
    </DesktopAppShell>

    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.12),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_52%,#F8F9FD_100%)] pb-36 text-[#101828] lg:hidden">
      <div className="pointer-events-none absolute left-1/2 top-[-9rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-56 h-64 w-64 rounded-full bg-[#B9A8FF]/16 blur-3xl" />

      <div className="relative mx-auto w-full max-w-xl px-4 pb-10 pt-10 sm:px-5">
        <header className="mb-7 flex items-start gap-4 px-1">
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
              {t('title')}
            </h1>
            <p className="mt-1 max-w-[34rem] text-[1.05rem] font-medium tracking-[-0.025em] text-[#7A8497]">
              {subtitle}
            </p>
          </div>

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
                      {t('transactions')}
                    </p>
                    <p className="mt-3 text-[2.45rem] font-semibold leading-none tracking-[-0.07em] text-[#121A31]">
                      {filteredTransactions.length}
                    </p>
                    <p className="mt-3 text-[0.88rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                      {t('loadedFromCompleteHistory')}
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
                      {t('incoming')}
                    </p>
                    <p className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.07em] text-[#27906E]">
                      {formatTransactionAmount(sumTransactionAmounts(incomingTransactions))}
                    </p>
                    <p className="mt-3 text-[0.88rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                      {t('movementsCount', { count: incomingTransactions.length })}
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
                      {t('outgoing')}
                    </p>
                    <p className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.07em] text-[#C42847]">
                      {formatTransactionAmount(sumTransactionAmounts(outgoingTransactions))}
                    </p>
                    <p className="mt-3 text-[0.88rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                      {t('movementsCount', { count: outgoingTransactions.length })}
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
                  {t('filters')}
                </h2>
                <p className="mt-1 text-[0.92rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                  {t('mobileFiltersSubtitle')}
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
                  {t('clearFilters')}
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
                  placeholder={t('mobileSearchPlaceholder')}
                  className="w-full bg-transparent text-[0.98rem] font-medium tracking-[-0.02em] text-[#17203A] outline-none placeholder:text-[#99A3B6]"
                />
              </div>

              <div className="space-y-2.5">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#6B39F4]">
                    <IconTag />
                  </span>
                  <AppCombobox
                    value={movementFilter}
                    onChange={(next) => setMovementFilter(next as MovementFilter)}
                    options={movementTypeOptions.map((option) => ({
                      value: option.value,
                      label: tx(option.labelKey),
                    }))}
                    className="pl-10"
                  />
                </div>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#6B39F4]">
                    <IconShield />
                  </span>
                  <AppCombobox
                    value={statusFilter}
                    onChange={(next) => setStatusFilter(next as StatusFilter)}
                    options={statusOptions.map((option) => ({
                      value: option.value,
                      label: tx(option.labelKey),
                    }))}
                    className="pl-10"
                  />
                </div>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#6B39F4]">
                    <IconSort />
                  </span>
                  <AppCombobox
                    value={sortBy}
                    onChange={(next) => setSortBy(next as SortFilter)}
                    options={sortOptions.map((option) => ({
                      value: option.value,
                      label: tx(option.labelKey),
                    }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="rounded-full bg-[#F6F4FF] p-1">
                <div className="grid grid-cols-3 gap-1">
                  {(['all', 'incoming', 'outgoing'] as const).map((option) => {
                    const active = directionFilter === option;
                    const label =
                      option === 'all'
                        ? t('allDirections')
                        : option === 'incoming'
                          ? t('incoming')
                          : t('outgoing');

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
            <SectionLoadingSkeleton rows={4} />
          ) : null}

          {statusMessage ? (
            <div className="rounded-[26px] border border-[#F5C8D1] bg-[#FFF3F6] px-5 py-4 text-[0.95rem] font-medium tracking-[-0.02em] text-[#C42847] shadow-[0_18px_46px_rgba(31,38,64,0.08)]">
              {statusMessage}
            </div>
          ) : null}

          {!loading && !statusMessage && transactions.length === 0 ? (
            <div className="rounded-[26px] border border-white/85 bg-white/88 px-5 py-5 text-[0.95rem] font-medium text-[#8A93A6] shadow-[0_18px_46px_rgba(31,38,64,0.08)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-xl">
              {t('emptyAllDescription')}
            </div>
          ) : null}

          {!loading && !statusMessage && transactions.length > 0 && filteredTransactions.length === 0 ? (
            <div className="rounded-[26px] border border-white/85 bg-white/88 px-5 py-5 text-[0.95rem] font-medium text-[#8A93A6] shadow-[0_18px_46px_rgba(31,38,64,0.08)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-xl">
              {t('emptyCurrentFilters')}
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
              const senderProfile = transaction.from_wallet
                ? directoryProfiles[transaction.from_wallet.toLowerCase()]
                : undefined;
              const senderDisplayName = isCurrentSender
                ? profileName || profileEmail || t('currentUser')
                : getDirectoryDisplayName(senderProfile, t('investAppUser'));
              const senderAvatarUrl = isCurrentSender
                ? avatarUrl
                : senderProfile?.avatar_url ?? null;
              const senderContact = isCurrentSender
                ? profileEmail || t('emailPending')
                : senderProfile?.email?.trim() || t('emailPending');
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
                            {tx(getTransactionTitleKey(transaction, smartWalletAddress))}
                          </p>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold tracking-[-0.01em] ${getStatusTone(transaction.status)}`}
                          >
                            {tx(getStatusLabelKey(transaction.status))}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold tracking-[-0.01em] ${getDirectionTone(direction)}`}
                          >
                            {tx(getDirectionLabelKey(direction))}
                          </span>
                        </div>

                        <p className="mt-2 text-[0.86rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                          {tx(getMovementTypeLabelKey(transaction.movement_type))} ·{' '}
                          {formatDateTime(transaction.created_at, locale, t('justNow'))}
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
                        {t('hash')}
                      </p>
                      <p className="mt-1 text-[0.95rem] font-medium tracking-[-0.02em] text-[#77819A]">
                        {transaction.tx_hash
                          ? shortenIdentifier(transaction.tx_hash, 8)
                          : t('notAvailable')}
                      </p>
                    </div>

                    <div className="flex items-end justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3.5">
                        <Avatar
                          src={senderAvatarUrl ?? undefined}
                          alt={senderDisplayName}
                          fallback={initialsFrom(senderDisplayName)}
                          className="h-14 w-14 shrink-0 rounded-full border-[2px] border-white bg-[#F4F0FF] text-sm font-semibold text-[#6B39F4] shadow-[0_12px_24px_rgba(31,38,64,0.08)]"
                        />

                        <div className="min-w-0">
                          <p className="text-[0.82rem] font-semibold tracking-[-0.02em] text-[#121A31]">
                            {t('from')}
                          </p>
                          <p className="mt-2 truncate text-[1rem] font-semibold tracking-[-0.04em] text-[#121A31]">
                            {senderDisplayName}
                          </p>
                          <p className="mt-1 truncate text-[0.92rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                            {senderContact}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        iconOnly
                        size="md"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleCopy(transaction);
                        }}
                        aria-label={copyActive ? t('copiedTransactionHash') : t('copyTransactionHash')}
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] transition ${
                          copyActive
                            ? 'bg-[#F4F0FF] text-[#6B39F4]'
                            : 'bg-[#F7F5FF] text-[#7A59FF] hover:bg-[#F1ECFF]'
                        }`}
                      >
                        {copyActive ? <IconCheck /> : <IconCopy />}
                      </Button>
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
    </>
  );
}
