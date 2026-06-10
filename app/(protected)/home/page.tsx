'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import { useTranslations } from 'next-intl';
import BottomNav from '@/components/BottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import SharedDesktopTopbar from '@/components/DesktopTopbar';
import { SectionLoadingSkeleton } from '@/components/AppLoadingSkeleton';
import InvestorWalletCard from '@/components/InvestorWalletCard';
import { Avatar } from '@/components/tailgrids/core/avatar';
import {
  formatNextRepaymentDate,
  getInvestmentHealth,
  getInvestmentHealthMeta,
  getNextRepaymentDate,
} from '@/lib/investor-overview';
import { calculateInvestmentProjection } from '@/lib/investment-math';
import { useInvestApp } from '@/lib/investapp-context';
import { HOME_REFRESH_INTERVAL_MS, canDeleteProject, isProjectPubliclyVisible } from '@/lib/project-status';
import { fetchCurrentUserInternalLedger } from '@/utils/client/current-user-internal-ledger';
import { fetchCurrentUserInvestments } from '@/utils/client/current-user-investments';
import { fetchCurrentUserKycSummary } from '@/utils/client/current-user-kyc';
import { deleteCurrentUserProject, fetchCurrentUserProjects } from '@/utils/client/current-user-projects';
import { fetchProjects } from '@/utils/client/projects';
import { fetchRecipientDirectory } from '@/utils/client/recipient-directory';
import { fetchCurrentUserTransactions } from '@/utils/client/current-user-transactions';
import type { InternalAccountBalance } from '@/utils/internal-ledger/types';
import { getKycLevelBadgeLabel } from '@/utils/kyc/shared';
import { useUserProfileSummary } from '@/lib/use-user-profile-summary';
import { runUserDirectoryQuery } from '@/utils/supabase/user-directory';
import type { CurrentUserTransaction } from '@/utils/transactions/current-user';

function IconEye({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 4.6A10.4 10.4 0 0 1 12 4c5 0 9.3 3.1 11 8-0.7 2-1.9 3.7-3.5 4.9" />
      <path d="M6.1 6.1C4 7.5 2.5 9.5 1 12c1.7 4.9 6 8 11 8 1 0 2-0.1 3-0.4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.58103 11.2216C7.40814 8.30868 9.77448 7 12 7C14.2255 7 16.5919 8.30868 18.419 11.2216C18.7169 11.6966 18.7169 12.3034 18.419 12.7784C16.5919 15.6913 14.2255 17 12 17C9.77448 17 7.40814 15.6913 5.58103 12.7784C5.28309 12.3034 5.28309 11.6966 5.58103 11.2216ZM20.1132 10.1588C18.0178 6.81811 15.0793 5 12 5C8.92069 5 5.98221 6.81811 3.88675 10.1588C3.18118 11.2837 3.18118 12.7163 3.88675 13.8412C5.98221 17.1819 8.92069 19 12 19C15.0793 19 18.0178 17.1819 20.1132 13.8412C20.8188 12.7163 20.8188 11.2837 20.1132 10.1588ZM11.9153 10.0018C11.9434 10.0006 11.9716 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 11.9716 10.0006 11.9434 10.0018 11.9153C10.1577 11.9701 10.3253 12 10.5 12C11.3284 12 12 11.3284 12 10.5C12 10.3253 11.9701 10.1577 11.9153 10.0018ZM12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8Z"
        fill="currentColor"
      />
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
      <path d="M16.6569 16.6569C19.781 13.5327 19.781 8.46734 16.6569 5.34315C13.5327 2.21895 8.46734 2.21895 5.34315 5.34315C2.21895 8.46734 2.21895 13.5327 5.34315 16.6569C8.46734 19.781 13.5327 19.781 16.6569 16.6569ZM16.6569 16.6569L21 21M7.46448 7.46447C9.4171 5.51184 12.5829 5.51184 14.5355 7.46447" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M10 2H14M10 21.2361C10.5308 21.7111 11.2316 22 12 22C12.7684 22 13.4692 21.7111 14 21.2361M5.08493 18.5C4.27945 18.5 3.75557 17.7407 4.11579 17.0954L5.43842 14.7258C6.19069 13.3781 6.58234 11.892 6.58234 10.3852V9.76471C6.58234 8.11791 7.49804 6.6627 8.89823 5.78534C8.96478 5.74364 9.03243 5.70324 9.10113 5.6642C9.93938 5.1877 10.9337 4.91176 12 4.91176C13.0663 4.91176 14.0606 5.1877 14.8989 5.6642C14.9676 5.70324 15.0352 5.74364 15.1018 5.78534C16.502 6.6627 17.4177 8.11791 17.4177 9.76471V10.3852C17.4177 11.892 17.8093 13.3781 18.5616 14.7258L19.8842 17.0954C20.2444 17.7407 19.7205 18.5 18.9151 18.5H15H9H5.08493Z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M6 9.8835H4.5C3.67157 9.8835 3 9.20482 3 8.36762V8.16524C3 7.36649 3.46547 6.64266 4.18772 6.31826L11.1877 3.1742C11.7049 2.94193 12.2951 2.94193 12.8123 3.1742L19.8123 6.31826C20.5345 6.64266 21 7.36649 21 8.16524V8.36762C21 9.20482 20.3284 9.8835 19.5 9.8835H18M6 9.8835V16.9576M6 9.8835H10M6 16.9576H4.5C3.67157 16.9576 3 17.6363 3 18.4735V19.4841C3 20.3213 3.67157 21 4.5 21H19.5C20.3284 21 21 20.3213 21 19.4841V18.4735C21 17.6363 20.3284 16.9576 19.5 16.9576H18M6 16.9576H10M18 9.8835V16.9576M18 9.8835H14M18 16.9576H14M14 9.8835V16.9576M14 9.8835H10M14 16.9576H10M10 9.8835V16.9576"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSend() {
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
      <path d="M21 12V10M13 19H6.29198H5C3.89543 19 3 18.1046 3 17V10M21 10V7C21 5.89543 20.1046 5 19 5H17.708H6.29198H5C3.89543 5 3 5.89543 3 7V10M21 10H3M16 17H21M21 17L19 15M21 17L19 19" />
    </svg>
  );
}

function IconDownload() {
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
      <path d="M12 6V14M12 14L14.5 11.5M12 14L9.5 11.5M15.5 8H17C18.6569 8 20 9.34315 20 11V15C20 16.6569 18.6569 18 17 18H7C5.34315 18 4 16.6569 4 15V11C4 9.34315 5.34315 8 7 8H8.5" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 18h10l1-18" />
      <path d="M10 11v9" />
      <path d="M14 11v9" />
    </svg>
  );
}

type ActionItem = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
};

type LastProject = {
  id: string;
  title: string;
  amount_requested: number | null;
  amount_received: number | null;
  currency: string | null;
  photo_urls: string[] | null;
  created_at: string;
  interest_rate: number | null;
};

type TransactionRow = CurrentUserTransaction;

type ActiveInvestmentRow = {
  id: string;
  created_at: string;
  project_id: string;
  project_title: string | null;
  amount: number | null;
  interest_rate_ea: number | null;
  term_months: number | null;
  projected_return_usdc: number | null;
  projected_total_usdc: number | null;
  status: 'submitted' | 'confirmed' | 'failed';
};

type RawActiveInvestmentRow = Omit<ActiveInvestmentRow, 'amount'> & {
  amount?: number | null;
  amount_usdc?: number | null;
};

type ProjectFundingSummary = {
  id: string;
  title: string;
  business_name: string | null;
  owner_user_id: string | null;
  amount_requested: number | null;
  amount_received: number | null;
  currency: string | null;
  photo_urls: string[] | null;
  interest_rate: number | null;
  term_months: number | null;
  installment_count: number | null;
};

type HomeActiveInvestment = ActiveInvestmentRow & {
  project: ProjectFundingSummary | null;
  ownerName: string;
  nextRepaymentLabel: string;
};

type OwnerSummary = {
  id: string;
  name: string | null;
  surname: string | null;
};

type SearchProjectRow = {
  id: string | number;
  uuid?: string | null;
  title: string | null;
  business_name: string | null;
  owner_user_id: string | null;
  owner_id?: string | null;
  amount_requested: number | null;
  amount_received: number | null;
  currency: string | null;
  photo_urls: string[] | null;
  status: string | null;
  publication_end_date?: string | null;
};

type SearchUserRow = {
  id: string;
  name: string | null;
  surname: string | null;
  email: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
  role: string | null;
};

type SearchProjectResult = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
};

type SearchUserResult = {
  id: string;
  displayName: string;
  subtitle: string;
  avatarUrl: string | null;
  walletAddress: string | null;
  linkedProjectId: string | null;
};

type SearchTransactionResult = {
  id: string;
  txHash: string | null;
  createdAt: string;
  movementType: string;
  amount: number | null;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const isIncomingTransaction = (transaction: TransactionRow, walletAddress?: string) => {
  const currentWallet = walletAddress?.toLowerCase();
  const toWallet = transaction.to_wallet?.toLowerCase();
  const fromWallet = transaction.from_wallet?.toLowerCase();
  if (transaction.movement_type === 'buy') return true;
  if (!currentWallet || !toWallet) return false;
  return toWallet === currentWallet && fromWallet !== currentWallet;
};

const getTransactionTypeLabel = (transaction: TransactionRow, walletAddress?: string) => {
  if (isIncomingTransaction(transaction, walletAddress)) return 'Received';
  if (transaction.movement_type === 'repayment') return 'Repayment';
  return 'Send';
};

const formatTransactionAmount = (amount: number | null) => {
  if (amount == null) return '0.00 USD';
  return `${Number(amount).toFixed(2)} USD`;
};

const formatMoney = (amount: number | null, currency: string | null = 'USD') => {
  if (amount == null) return '--';
  const code = currency ?? 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Number(amount).toFixed(2)} ${code}`;
  }
};

const calculateFundingProgress = (raised: number | null, requested: number | null) => {
  if (!requested || requested <= 0) return 0;
  const progress = ((raised ?? 0) / requested) * 100;
  return Math.max(0, Math.min(100, progress));
};

const formatTransactionDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Now';
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
  });
};

const formatInvestmentCardDate = (value: Date | null) => {
  if (!value || Number.isNaN(value.getTime())) return '--/--/--';
  return value.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
};

const formatInvestmentCardAmount = (amount: number | null) => {
  if (amount == null) return '0.00 USD';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' USD';
};

const normalizeSearchQuery = (value: string) => value.trim().replace(/\s+/g, ' ');

const sanitizeSearchFragment = (value: string) =>
  normalizeSearchQuery(value).replace(/[,()]/g, ' ').trim();

const shortenIdentifier = (value: string | null | undefined, size = 6) => {
  if (!value) return '';
  if (value.length <= size * 2) return value;
  return `${value.slice(0, size)}...${value.slice(-size)}`;
};

const getUserDisplayName = (user: SearchUserRow) => {
  const fullName = `${user.name ?? ''} ${user.surname ?? ''}`.trim();
  if (fullName) return fullName;
  if (user.email?.trim()) return user.email.trim();
  return shortenIdentifier(user.id, 8) || 'User';
};

const matchesSearchUser = (user: SearchUserRow, normalizedQuery: string) => {
  const fields = [
    user.name,
    user.surname,
    user.email,
    user.id,
    user.wallet_address,
    `${user.name ?? ''} ${user.surname ?? ''}`.trim(),
  ];
  return fields.some((field) => field?.toLowerCase().includes(normalizedQuery));
};

const initialsFrom = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';

const formatDesktopTransactionDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Now';

  return `${date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })} ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
};

const getTransactionStatusMeta = (status: TransactionRow['status']) => {
  if (status === 'confirmed') {
    return {
      label: 'Completed',
      className: 'bg-[#DDFBEA] text-[#087A52]',
    };
  }

  if (status === 'failed') {
    return {
      label: 'Failed',
      className: 'bg-[#FFF1F3] text-[#DF1C41]',
    };
  }

  return {
    label: 'Pending',
    className: 'bg-[#FFF7E8] text-[#B76E00]',
  };
};

function IconChevronRight({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

function DesktopAvatar({
  avatarUrl,
  displayName,
  loading,
  sizeClassName = 'h-11 w-11',
}: {
  avatarUrl: string;
  displayName: string;
  loading: boolean;
  sizeClassName?: string;
}) {
  return (
    <Avatar
      src={avatarUrl ?? undefined}
      alt={displayName}
      fallback={loading ? '' : initialsFrom(displayName)}
      className={`shrink-0 rounded-full bg-[#EEF2FF] font-bold text-[#6B39F4] ring-2 ring-white shadow-[0_12px_28px_rgba(21,28,44,0.10)] ${sizeClassName}`}
    />
  );
}

function DesktopSearchResults({
  displayName,
  onClear,
  onClose,
  onOpenProject,
  onOpenTransaction,
  onOpenUser,
  searchError,
  searchProjects,
  searchQuery,
  searching,
  searchTransactions,
  searchUsers,
  totalSearchResults,
}: {
  displayName: string;
  onClear: () => void;
  onClose: () => void;
  onOpenProject: (id: string) => void;
  onOpenTransaction: (id: string) => void;
  onOpenUser: (entry: SearchUserResult) => void;
  searchError: string | null;
  searchProjects: SearchProjectResult[];
  searchQuery: string;
  searching: boolean;
  searchTransactions: SearchTransactionResult[];
  searchUsers: SearchUserResult[];
  totalSearchResults: number;
}) {
  const t = useTranslations('Home');
  const trimmed = normalizeSearchQuery(searchQuery);

  return (
    <div className="absolute left-0 top-[calc(100%+12px)] z-40 w-full overflow-hidden rounded-[24px] border border-[#E4E8F1] bg-white p-3 shadow-[0_28px_80px_rgba(17,24,39,0.16)]">
      <div className="mb-3 flex items-center justify-between gap-3 px-2">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A95A8]">
          {t('searchInvestApp')}
        </p>
        <button type="button" onClick={onClose} className="text-xs font-bold text-[#6B39F4]">
          {t('close')}
        </button>
      </div>

      {trimmed.length < 2 ? (
        <div className="rounded-2xl bg-[#F8F9FB] px-4 py-4 text-sm font-medium text-[#66728A]">
          {t('desktopSearchHint')}
        </div>
      ) : searching ? (
        <div className="rounded-2xl bg-[#F8F9FB] px-4 py-4 text-sm font-medium text-[#66728A]">
          {t('searchingFor', { query: trimmed })}
        </div>
      ) : searchError ? (
        <div className="rounded-2xl bg-[#FFF1F3] px-4 py-4 text-sm font-semibold text-[#DF1C41]">
          {t('searchError')}
        </div>
      ) : totalSearchResults === 0 ? (
        <div className="rounded-2xl bg-[#F8F9FB] px-4 py-4 text-sm font-medium text-[#66728A]">
          {t('noMatches', { query: trimmed })}
        </div>
      ) : (
        <div className="max-h-[460px] space-y-5 overflow-y-auto pr-1">
          {searchProjects.length > 0 ? (
            <section className="space-y-2">
              <p className="px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B39F4]/75">
                {t('ventures')}
              </p>
              {searchProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onOpenProject(project.id)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition duration-200 hover:bg-[#F8F9FB]"
                >
                  <span
                    className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#F1ECFF] bg-cover bg-center text-xs font-bold text-[#6B39F4]"
                    style={{ backgroundImage: project.imageUrl ? `url(${JSON.stringify(project.imageUrl)})` : undefined }}
                  >
                    {project.imageUrl ? null : '#'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[#111827]">{project.title}</span>
                    <span className="mt-0.5 block truncate text-xs font-medium text-[#66728A]">
                      {project.subtitle}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-[#6B39F4]">{t('open')}</span>
                </button>
              ))}
            </section>
          ) : null}

          {searchUsers.length > 0 ? (
            <section className="space-y-2">
              <p className="px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B39F4]/75">
                {t('people')}
              </p>
              {searchUsers.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onOpenUser(entry)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition duration-200 hover:bg-[#F8F9FB]"
                >
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#F1ECFF] bg-cover bg-center text-xs font-bold text-[#6B39F4]"
                    style={{ backgroundImage: entry.avatarUrl ? `url(${JSON.stringify(entry.avatarUrl)})` : undefined }}
                  >
                    {entry.avatarUrl ? null : initialsFrom(entry.displayName || displayName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[#111827]">{entry.displayName}</span>
                    <span className="mt-0.5 block truncate text-xs font-medium text-[#66728A]">
                      {entry.subtitle}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-[#6B39F4]">
                    {entry.linkedProjectId ? t('venture') : t('send')}
                  </span>
                </button>
              ))}
            </section>
          ) : null}

          {searchTransactions.length > 0 ? (
            <section className="space-y-2">
              <p className="px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B39F4]/75">
                {t('hashes')}
              </p>
              {searchTransactions.map((transaction) => (
                <button
                  key={transaction.id}
                  type="button"
                  onClick={() => onOpenTransaction(transaction.txHash ?? transaction.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition duration-200 hover:bg-[#F8F9FB]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-[#111827]">
                      {shortenIdentifier(transaction.txHash ?? transaction.id, 10)}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-medium text-[#66728A]">
                      {transaction.movementType} / {formatTransactionDate(transaction.createdAt)}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-[#6B39F4]">
                    {formatTransactionAmount(transaction.amount)}
                  </span>
                </button>
              ))}
            </section>
          ) : null}
        </div>
      )}

      {searchQuery ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm font-bold text-[#6B39F4] transition duration-200 hover:bg-[#EEE8FF]"
        >
          {t('clearSearch')}
        </button>
      ) : null}
    </div>
  );
}

function DesktopTopbar({
  avatarUrl,
  displayName,
  loadingProfileSummary,
  notificationsEnabled,
  onBellClick,
  onClearSearch,
  onCloseSearch,
  onOpenProject,
  onOpenTransaction,
  onOpenUser,
  roleLabel,
  searchError,
  searchProjects,
  searchQuery,
  searching,
  searchTransactions,
  searchUsers,
  setSearchQuery,
  setShowSearch,
  showSearch,
  totalSearchResults,
  unreadNotificationsCount,
}: {
  avatarUrl: string;
  displayName: string;
  loadingProfileSummary: boolean;
  notificationsEnabled: boolean;
  onBellClick: () => void;
  onClearSearch: () => void;
  onCloseSearch: () => void;
  onOpenProject: (id: string) => void;
  onOpenTransaction: (id: string) => void;
  onOpenUser: (entry: SearchUserResult) => void;
  roleLabel: string;
  searchError: string | null;
  searchProjects: SearchProjectResult[];
  searchQuery: string;
  searching: boolean;
  searchTransactions: SearchTransactionResult[];
  searchUsers: SearchUserResult[];
  setSearchQuery: (value: string) => void;
  setShowSearch: (value: boolean) => void;
  showSearch: boolean;
  totalSearchResults: number;
  unreadNotificationsCount: number;
}) {
  const t = useTranslations('Home');
  return (
    <SharedDesktopTopbar
      avatarUrl={avatarUrl}
      displayName={displayName}
      loading={loadingProfileSummary}
      notificationOnClick={onBellClick}
      notificationsEnabled={notificationsEnabled}
      roleLabel={roleLabel}
      searchOverlay={
        showSearch ? (
          <DesktopSearchResults
            displayName={displayName}
            onClear={onClearSearch}
            onClose={onCloseSearch}
            onOpenProject={onOpenProject}
            onOpenTransaction={onOpenTransaction}
            onOpenUser={onOpenUser}
            searchError={searchError}
            searchProjects={searchProjects}
            searchQuery={searchQuery}
            searching={searching}
            searchTransactions={searchTransactions}
            searchUsers={searchUsers}
            totalSearchResults={totalSearchResults}
          />
        ) : null
      }
      searchPlaceholder={t('desktopSearchPlaceholder')}
      searchValue={searchQuery}
      unreadNotificationsCount={unreadNotificationsCount}
      onSearchChange={(value) => {
        setSearchQuery(value);
        setShowSearch(true);
      }}
      onSearchFocus={() => setShowSearch(true)}
    />
  );
}

function DesktopBalanceCard({
  availableBalanceLabel,
  balanceCurrencyLabel,
  investorAverageRate,
  investorEarnings,
  lastProject,
  role,
  showBalance,
  activeCount,
  onToggleBalance,
}: {
  availableBalanceLabel: string;
  balanceCurrencyLabel: string;
  investorAverageRate: number;
  investorEarnings: number;
  lastProject: LastProject | null;
  role: string | null;
  showBalance: boolean;
  activeCount: number;
  onToggleBalance: () => void;
}) {
  const t = useTranslations('Home');
  return (
    <section className="relative min-h-[300px] overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_72%_20%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,#5E2CFF_0%,#4B27F0_52%,#334EFF_100%)] p-8 text-white shadow-[0_26px_60px_rgba(91,72,255,0.28)] transition duration-300 hover:-translate-y-0.5">
      <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-white/14 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-5rem] left-[-4rem] h-48 w-48 rounded-full bg-[#9CF3E5]/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 opacity-30">
        <svg viewBox="0 0 520 140" className="h-full w-full">
          <path
            d="M0 116C44 104 64 91 105 99C159 110 190 74 248 84C302 93 318 105 365 72C416 36 434 78 520 14"
            fill="none"
            stroke="rgba(255,255,255,0.34)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="500" cy="23" r="7" fill="#FFFFFF" />
        </svg>
      </div>

      <div className="relative flex h-full flex-col justify-between gap-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-base font-medium text-white/78">{t('available')}</p>
            <h2 className="mt-6 text-[3.35rem] font-semibold leading-none tracking-[-0.07em]">
              {showBalance ? `$${availableBalanceLabel}` : 'XXXX.XX'}{' '}
              <span className="align-baseline text-[1.35rem] font-semibold tracking-[-0.04em] text-white/78">
                {balanceCurrencyLabel}
              </span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onToggleBalance}
            className="grid h-14 w-14 place-items-center rounded-2xl bg-white/16 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-xl transition duration-200 hover:bg-white/24"
            aria-label={showBalance ? t('hideBalance') : t('showBalance')}
          >
            <IconEye hidden={!showBalance} />
          </button>
        </div>

        {role === 'emprendedor' ? (
          <div className="relative inline-flex w-fit max-w-full flex-wrap items-center gap-2 rounded-full bg-[#EFFFF9]/95 px-5 py-3 text-sm font-bold tracking-[-0.02em] text-[#198F79] shadow-[0_16px_28px_rgba(14,165,143,0.12)]">
            <span>{t('raisedMetric', { value: formatMoney(lastProject?.amount_received ?? 0, lastProject?.currency ?? 'USD') })}</span>
            <span className="h-1 w-1 rounded-full bg-[#35A994]/45" />
            <span>{t('interestRateMetric', { value: lastProject?.interest_rate ? `${lastProject.interest_rate}%` : '--' })}</span>
          </div>
        ) : (
          <div className="relative inline-flex w-fit max-w-full flex-wrap items-center gap-2 rounded-full bg-[#EFFFF9]/95 px-5 py-3 text-sm font-bold tracking-[-0.02em] text-[#198F79] shadow-[0_16px_28px_rgba(14,165,143,0.12)]">
            <span>{t('activeMetric', { count: activeCount })}</span>
            <span className="h-1 w-1 rounded-full bg-[#35A994]/45" />
            <span>{t('avgRateMetric', { value: investorAverageRate ? `${investorAverageRate.toFixed(1)}%` : '--' })}</span>
            <span className="h-1 w-1 rounded-full bg-[#35A994]/45" />
            <span>{t('earningMetric', { value: formatMoney(investorEarnings, 'USD') })}</span>
          </div>
        )}
      </div>
    </section>
  );
}

function DesktopActiveInvestmentCard({
  investment,
  loading,
  onOpenPortfolio,
  onOpenProject,
}: {
  investment: HomeActiveInvestment | null;
  loading: boolean;
  onOpenPortfolio: () => void;
  onOpenProject: (projectId: string) => void;
}) {
  const t = useTranslations('Home');
  if (loading) {
    return <section className="min-h-[300px] animate-pulse rounded-[24px] bg-[#111C2E]" />;
  }

  if (!investment) {
    return (
      <section className="flex min-h-[300px] flex-col justify-between rounded-[24px] bg-[#111C2E] p-7 text-white shadow-[0_26px_60px_rgba(15,23,42,0.18)]">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-[-0.045em]">{t('activeInvestments')}</h2>
            <button type="button" onClick={onOpenPortfolio} className="text-sm font-bold text-[#8A68FF]">
              {t('viewAll')}
            </button>
          </div>
          <p className="mt-9 max-w-sm text-sm leading-6 text-white/64">
            {t('activeInvestmentsEmpty')}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenPortfolio}
          className="w-fit rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white transition duration-200 hover:bg-white/16"
        >
          {t('reviewPortfolio')}
        </button>
      </section>
    );
  }

  const project = investment.project;
  const projectTitle = project?.business_name || project?.title || investment.project_title || t('business');
  const tone = getInvestmentHealthMeta(
    getInvestmentHealth(getNextRepaymentDate(investment.created_at, investment.term_months))
  );
  const statusClassName =
    tone.label === 'Up to date'
      ? 'bg-[#DDFBEA] text-[#087A52]'
      : tone.label === 'Due soon'
        ? 'bg-[#FFF7E8] text-[#B76E00]'
        : 'bg-[#FFF1F3] text-[#DF1C41]';

  return (
    <section className="relative min-h-[300px] overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#111C2E_0%,#0E1726_100%)] p-7 text-white shadow-[0_26px_60px_rgba(15,23,42,0.18)] transition duration-300 hover:-translate-y-0.5">
      <div className="pointer-events-none absolute inset-x-0 top-[55%] h-px bg-white/10" />
      <div className="pointer-events-none absolute inset-x-0 top-[72%] h-px bg-white/10" />
      <div className="relative flex h-full flex-col justify-between gap-7">
        <div>
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="mb-5 flex items-center justify-between gap-6">
                <h2 className="text-xl font-bold tracking-[-0.045em]">{t('activeInvestments')}</h2>
                <button type="button" onClick={onOpenPortfolio} className="text-sm font-bold text-[#8A68FF]">
                  {t('viewAll')}
                </button>
              </div>
              <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${statusClassName}`}>
                {tone.label}
              </span>
              <button
                type="button"
                onClick={() => onOpenProject(investment.project_id)}
                className="mt-3 block text-left text-[1.35rem] font-bold leading-tight tracking-[-0.045em] transition hover:text-white/82"
              >
                {projectTitle}
              </button>
              <p className="mt-1 text-sm font-medium text-white/64">
                {investment.ownerName} / {t('investment')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenProject(investment.project_id)}
              className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-white/12 bg-cover bg-center ring-2 ring-white/18"
              style={{ backgroundImage: project?.photo_urls?.[0] ? `url(${JSON.stringify(project.photo_urls[0])})` : undefined }}
              aria-label={`Open ${projectTitle}`}
            >
              {project?.photo_urls?.[0] ? null : (
                <span className="grid h-full w-full place-items-center text-sm font-bold text-white">
                  {initialsFrom(projectTitle)}
                </span>
              )}
            </button>
          </div>
        </div>

        <p className="text-[1.1rem] font-semibold tracking-[0.32em] text-white/90">
          {investment.id.slice(0, 4).toUpperCase()} {investment.project_id.slice(0, 4).toUpperCase()} PROJECT
        </p>

        <div className="grid grid-cols-4 gap-5">
          <div>
            <p className="text-sm text-white/62">{t('investor')}</p>
            <p className="mt-2 truncate text-sm font-bold">{investment.ownerName}</p>
          </div>
          <div>
            <p className="text-sm text-white/62">{t('date')}</p>
            <p className="mt-2 text-sm font-bold">
              {formatInvestmentCardDate(getNextRepaymentDate(investment.created_at, investment.term_months))}
            </p>
          </div>
          <div>
            <p className="text-sm text-white/62">{t('invested')}</p>
            <p className="mt-2 text-sm font-bold">{formatInvestmentCardAmount(investment.amount ?? 0)}</p>
          </div>
          <div>
            <p className="text-sm text-white/62">{t('return')}</p>
            <p className="mt-2 text-sm font-bold text-[#27D6A4]">
              +{Number(investment.interest_rate_ea ?? 0).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DesktopBusinessCard({
  deletingProjectId,
  fundingProgress,
  lastProject,
  loading,
  onDeleteProject,
  onOpenProject,
  onOpenPortfolio,
}: {
  deletingProjectId: string | null;
  fundingProgress: number;
  lastProject: LastProject | null;
  loading: boolean;
  onDeleteProject: (projectId: string) => void;
  onOpenProject: (projectId: string) => void;
  onOpenPortfolio: () => void;
}) {
  const t = useTranslations('Home');
  const canDeleteLastProject = lastProject ? canDeleteProject(lastProject) : false;
  const isDeletingLastProject = Boolean(lastProject && deletingProjectId === lastProject.id);

  if (loading) {
    return <section className="min-h-[300px] animate-pulse rounded-[24px] bg-white" />;
  }

  return (
    <section className="min-h-[300px] rounded-[24px] border border-[#E8EBF4] bg-white p-7 shadow-[0_22px_52px_rgba(21,28,44,0.07)]">
      <div className="flex items-center justify-between gap-5">
        <h2 className="text-xl font-bold tracking-[-0.045em]">{t('myBusiness')}</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onOpenPortfolio} className="text-sm font-bold text-[#6B39F4]">
            {t('edit')}
          </button>
          {lastProject && canDeleteLastProject ? (
            <button
              type="button"
              aria-label="Delete publication"
              title="Delete publication"
              disabled={isDeletingLastProject}
              onClick={() => onDeleteProject(lastProject.id)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-[#FECACA] bg-[#FFF1F2] text-[#DC2626] transition duration-200 hover:-translate-y-0.5 hover:border-[#FCA5A5] hover:bg-[#FFE4E6] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <IconTrash />
            </button>
          ) : null}
        </div>
      </div>

      {lastProject ? (
        <button
          type="button"
          onClick={() => onOpenProject(lastProject.id)}
          className="mt-6 block w-full overflow-hidden rounded-[20px] border border-[#E8EBF4] text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(21,28,44,0.08)]"
        >
          <span
            className="block h-28 w-full bg-[#F4F0FF] bg-cover bg-center"
            style={{ backgroundImage: lastProject.photo_urls?.[0] ? `url(${JSON.stringify(lastProject.photo_urls[0])})` : undefined }}
          />
          <span className="block p-4">
            <span className="block text-base font-bold text-[#111827]">{lastProject.title}</span>
            <span className="mt-1 block text-sm font-medium text-[#66728A]">
              {t('raisedOf', {
                raised: formatMoney(lastProject.amount_received ?? 0, lastProject.currency ?? 'USD'),
                goal: formatMoney(lastProject.amount_requested ?? 0, lastProject.currency ?? 'USD'),
              })}
            </span>
            <span className="mt-4 block h-2 rounded-full bg-[#EEF1F7]">
              <span className="block h-2 rounded-full bg-[#6B39F4]" style={{ width: `${fundingProgress}%` }} />
            </span>
          </span>
        </button>
      ) : (
        <div className="mt-6 rounded-[20px] border border-dashed border-[#C9B8FF] bg-[#F8F5FF] p-7 text-center">
          <p className="text-base font-bold text-[#111827]">{t('noActiveProject')}</p>
          <p className="mt-2 text-sm font-medium text-[#66728A]">
            {t('listingsEmpty')}
          </p>
        </div>
      )}
    </section>
  );
}

function DesktopActionRail({ actions }: { actions: ActionItem[] }) {
  return (
    <section className="grid grid-cols-4 gap-4">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className="group flex min-h-[132px] flex-col items-center justify-center rounded-[22px] border border-[#E9ECF4] bg-white p-5 text-center shadow-[0_18px_38px_rgba(21,28,44,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_58px_rgba(21,28,44,0.11)]"
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F2EDFF] text-[#6B39F4] transition duration-200 group-hover:scale-105">
            {action.icon}
          </span>
          <span className="mt-4 block text-sm font-bold text-[#111827]">{action.label}</span>
        </button>
      ))}
    </section>
  );
}

function DesktopTransactionsTable({
  avatarUrl,
  displayName,
  loadingProfileSummary,
  loadingTransactions,
  onOpenHistory,
  smartWalletAddress,
  transactions,
}: {
  avatarUrl: string;
  displayName: string;
  loadingProfileSummary: boolean;
  loadingTransactions: boolean;
  onOpenHistory: () => void;
  smartWalletAddress?: string | null;
  transactions: TransactionRow[];
}) {
  const t = useTranslations('Home');
  return (
    <section className="rounded-[24px] border border-[#E8EBF4] bg-white p-7 shadow-[0_22px_52px_rgba(21,28,44,0.06)]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold tracking-[-0.045em] text-[#111827]">{t('recentTransactions')}</h2>
        <button type="button" onClick={onOpenHistory} className="text-sm font-bold text-[#6B39F4]">
          {t('viewAll')}
        </button>
      </div>

      <div className="mt-6 overflow-hidden">
        <div className="grid grid-cols-[minmax(260px,1.3fr)_0.8fr_1fr_1fr_0.8fr_32px] border-b border-[#E8EBF4] px-1 pb-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#7C879D]">
          <span>{t('contact')}</span>
          <span>{t('type')}</span>
          <span>{t('amount')}</span>
          <span>{t('date')}</span>
          <span>{t('status')}</span>
          <span />
        </div>

        {loadingTransactions ? (
          <div className="space-y-3 py-5">
            {[0, 1].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-2xl bg-[#F6F7FB]" />
            ))}
          </div>
        ) : null}

        {!loadingTransactions && transactions.length === 0 ? (
          <div className="rounded-2xl bg-[#F8F9FB] px-4 py-8 text-center text-sm font-medium text-[#66728A]">
            {t('activityEmpty')}
          </div>
        ) : null}

        {!loadingTransactions ? (
          <div className="divide-y divide-[#EEF1F7]">
            {transactions.slice(0, 5).map((transaction) => {
              const incoming = isIncomingTransaction(transaction, smartWalletAddress ?? undefined);
              const amountColor = incoming ? 'text-[#0B9B72]' : 'text-[#E33A24]';
              const amountPrefix = incoming ? '+' : '-';
              const statusMeta = getTransactionStatusMeta(transaction.status);

              return (
                <div
                  key={transaction.id}
                  className="grid grid-cols-[minmax(260px,1.3fr)_0.8fr_1fr_1fr_0.8fr_32px] items-center px-1 py-5"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <DesktopAvatar
                      avatarUrl={avatarUrl}
                      displayName={displayName}
                      loading={loadingProfileSummary}
                      sizeClassName="h-12 w-12 text-sm"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-[#111827]">{displayName}</span>
                      <span className="mt-1 block truncate text-sm font-medium text-[#66728A]">
                        @{displayName.toLowerCase().replace(/\s+/g, '')}
                      </span>
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#66728A]">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#F1ECFF] text-[#6B39F4]">
                      {incoming ? <IconDownload /> : <IconSend />}
                    </span>
                    {getTransactionTypeLabel(transaction, smartWalletAddress ?? undefined)}
                  </span>
                  <span className={`text-sm font-bold ${amountColor}`}>
                    {amountPrefix}
                    {formatTransactionAmount(transaction.amount)}
                  </span>
                  <span className="text-sm font-medium text-[#66728A]">
                    {formatDesktopTransactionDate(transaction.created_at)}
                  </span>
                  <span>
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </span>
                  <span className="text-right text-[#8D98AA]">...</span>
                </div>
              );
            })}
          </div>
        ) : null}

        {!loadingTransactions && transactions.length > 0 ? (
          <button
            type="button"
            onClick={onOpenHistory}
            className="mx-auto mt-5 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-[#6B39F4] transition duration-200 hover:bg-[#F5F3FF]"
          >
            {t('viewAllTransactions')}
            <IconChevronRight />
          </button>
        ) : null}
      </div>
    </section>
  );
}

function DesktopHomeDashboard({
  actions,
  activeInvestments,
  availableBalanceLabel,
  avatarUrl,
  balanceCurrencyLabel,
  deletingProjectId,
  displayName,
  fundingProgress,
  investorAverageRate,
  investorEarnings,
  lastProject,
  loadingActiveInvestments,
  loadingProfileSummary,
  loadingProject,
  loadingTransactions,
  notificationsEnabled,
  onBellClick,
  onClearSearch,
  onCloseSearch,
  onDeleteProject,
  onOpenHistory,
  onOpenPortfolio,
  onOpenProject,
  onOpenSearchProject,
  onOpenSearchTransaction,
  onOpenSearchUser,
  role,
  roleLabel,
  searchError,
  searchProjects,
  searchQuery,
  searching,
  searchTransactions,
  searchUsers,
  setSearchQuery,
  setShowSearch,
  showBalance,
  showSearch,
  smartWalletAddress,
  totalSearchResults,
  transactions,
  unreadNotificationsCount,
  onToggleBalance,
}: {
  actions: ActionItem[];
  activeInvestments: HomeActiveInvestment[];
  availableBalanceLabel: string;
  avatarUrl: string;
  balanceCurrencyLabel: string;
  deletingProjectId: string | null;
  displayName: string;
  fundingProgress: number;
  investorAverageRate: number;
  investorEarnings: number;
  lastProject: LastProject | null;
  loadingActiveInvestments: boolean;
  loadingProfileSummary: boolean;
  loadingProject: boolean;
  loadingTransactions: boolean;
  notificationsEnabled: boolean;
  onBellClick: () => void;
  onClearSearch: () => void;
  onCloseSearch: () => void;
  onDeleteProject: (projectId: string) => void;
  onOpenHistory: () => void;
  onOpenPortfolio: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenSearchProject: (id: string) => void;
  onOpenSearchTransaction: (id: string) => void;
  onOpenSearchUser: (entry: SearchUserResult) => void;
  role: string | null;
  roleLabel: string;
  searchError: string | null;
  searchProjects: SearchProjectResult[];
  searchQuery: string;
  searching: boolean;
  searchTransactions: SearchTransactionResult[];
  searchUsers: SearchUserResult[];
  setSearchQuery: (value: string) => void;
  setShowSearch: (value: boolean) => void;
  showBalance: boolean;
  showSearch: boolean;
  smartWalletAddress?: string | null;
  totalSearchResults: number;
  transactions: TransactionRow[];
  unreadNotificationsCount: number;
  onToggleBalance: () => void;
}) {
  return (
    <div className="investapp-desktop-autofit hidden min-h-screen bg-[#F8F9FB] text-[#101828] lg:block">
      <DesktopSidebar roleLabel={roleLabel} />
      <div className="min-w-0 pl-[260px]">
        <DesktopTopbar
          avatarUrl={avatarUrl}
          displayName={displayName}
          loadingProfileSummary={loadingProfileSummary}
          notificationsEnabled={notificationsEnabled}
          onBellClick={onBellClick}
          onClearSearch={onClearSearch}
          onCloseSearch={onCloseSearch}
          onOpenProject={onOpenSearchProject}
          onOpenTransaction={onOpenSearchTransaction}
          onOpenUser={onOpenSearchUser}
          roleLabel={roleLabel}
          searchError={searchError}
          searchProjects={searchProjects}
          searchQuery={searchQuery}
          searching={searching}
          searchTransactions={searchTransactions}
          searchUsers={searchUsers}
          setSearchQuery={setSearchQuery}
          setShowSearch={setShowSearch}
          showSearch={showSearch}
          totalSearchResults={totalSearchResults}
          unreadNotificationsCount={unreadNotificationsCount}
        />

        <main className="px-5 py-5 xl:px-7 2xl:px-9">
          <div className="w-full space-y-6">
            <section className="flex items-center gap-5">
              <DesktopAvatar
                avatarUrl={avatarUrl}
                displayName={displayName}
                loading={loadingProfileSummary}
                sizeClassName="h-16 w-16 text-base"
              />
              <div>
                <p className="text-lg font-semibold text-[#66728A]">Hello, {roleLabel}</p>
                <h1 className="mt-1 text-[2rem] font-bold leading-tight tracking-[-0.06em] text-[#111827]">
                  {displayName}
                </h1>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-5">
              <DesktopBalanceCard
                activeCount={activeInvestments.length}
                availableBalanceLabel={availableBalanceLabel}
                balanceCurrencyLabel={balanceCurrencyLabel}
                investorAverageRate={investorAverageRate}
                investorEarnings={investorEarnings}
                lastProject={lastProject}
                role={role}
                showBalance={showBalance}
                onToggleBalance={onToggleBalance}
              />

              {role === 'emprendedor' ? (
                <DesktopBusinessCard
                  deletingProjectId={deletingProjectId}
                  fundingProgress={fundingProgress}
                  lastProject={lastProject}
                  loading={loadingProject}
                  onDeleteProject={onDeleteProject}
                  onOpenPortfolio={onOpenPortfolio}
                  onOpenProject={onOpenProject}
                />
              ) : (
                <DesktopActiveInvestmentCard
                  investment={activeInvestments[0] ?? null}
                  loading={loadingActiveInvestments}
                  onOpenPortfolio={onOpenPortfolio}
                  onOpenProject={onOpenProject}
                />
              )}

            </section>

            <DesktopActionRail actions={actions} />

            <DesktopTransactionsTable
              avatarUrl={avatarUrl}
              displayName={displayName}
              loadingProfileSummary={loadingProfileSummary}
              loadingTransactions={loadingTransactions}
              onOpenHistory={onOpenHistory}
              smartWalletAddress={smartWalletAddress}
              transactions={transactions}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations('Home');
  const roleT = useTranslations('Roles');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getAccessToken } = usePrivy();
  const {
    faseApp,
    rolSeleccionado,
    userAlias,
    smartWalletAddress,
    balanceUSDC,
    lastReceipt,
    abrirCompra,
    notificationsEnabled,
    unreadNotificationsCount,
  } = useInvestApp();
  const { avatarUrl, displayName: profileName, loading: loadingProfileSummary } = useUserProfileSummary();
  const [showBalance, setShowBalance] = useState(true);
  const [lastProject, setLastProject] = useState<LastProject | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [activeInvestments, setActiveInvestments] = useState<HomeActiveInvestment[]>([]);
  const [loadingActiveInvestments, setLoadingActiveInvestments] = useState(false);
  const [internalBalance, setInternalBalance] = useState<InternalAccountBalance | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [openingTopUp, setOpeningTopUp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchProjects, setSearchProjects] = useState<SearchProjectResult[]>([]);
  const [searchUsers, setSearchUsers] = useState<SearchUserResult[]>([]);
  const [searchTransactions, setSearchTransactions] = useState<SearchTransactionResult[]>([]);
  const [showWithdrawProfilePrompt, setShowWithdrawProfilePrompt] = useState(false);
  const [missingWithdrawProfileFields, setMissingWithdrawProfileFields] = useState<string[]>([]);
  const [withdrawKycLevelLabel, setWithdrawKycLevelLabel] = useState('');
  const [checkingWithdrawRequirements, setCheckingWithdrawRequirements] = useState(false);
  const handledTopUpRequestRef = useRef(false);

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
    const loadLastProject = async () => {
      if (!user?.id || rolSeleccionado !== 'emprendedor') {
        setLastProject(null);
        return;
      }
      setLoadingProject(true);
      const { data } = await fetchCurrentUserProjects(getAccessToken, { limit: 1 });
      setLastProject(((data ?? [])[0] as LastProject | undefined) ?? null);
      setLoadingProject(false);
    };

    loadLastProject();
    const interval = window.setInterval(loadLastProject, HOME_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [getAccessToken, rolSeleccionado, user?.id, lastReceipt?.txHash]);

  useEffect(() => {
    const loadActiveInvestments = async () => {
      if (!user?.id || rolSeleccionado !== 'inversor') {
        setActiveInvestments([]);
        return;
      }

      setLoadingActiveInvestments(true);
      const { data, error } = await fetchCurrentUserInvestments(getAccessToken, {
        scope: 'investor',
        statuses: 'submitted,confirmed',
        limit: 5,
      });

      if (error) {
        console.error('Error loading active investments:', error);
        setActiveInvestments([]);
        setLoadingActiveInvestments(false);
        return;
      }

      const investments = ((data ?? []) as RawActiveInvestmentRow[])
        .filter((item) => item.id)
        .map((item) => ({
          ...item,
          amount: item.amount ?? item.amount_usdc ?? null,
        })) as ActiveInvestmentRow[];

      const projectIds = Array.from(
        new Set(investments.map((investment) => investment.project_id).filter(Boolean))
      );

      const projectMap = new Map<string, ProjectFundingSummary>();
      if (projectIds.length > 0) {
        const { data: projectsData, error: projectsError } = await fetchProjects(
          {
            ids: projectIds.join(','),
            limit: projectIds.length,
          },
          getAccessToken
        );

        if (projectsError) {
          console.error('Error loading invested projects:', projectsError);
        } else {
          ((projectsData ?? []) as ProjectFundingSummary[]).forEach((project) => {
            projectMap.set(String(project.id), { ...project, id: String(project.id) });
          });
        }
      }

      const ownerIds = Array.from(
        new Set(
          [...projectMap.values()].map((project) => project.owner_user_id).filter(Boolean)
        )
      ) as string[];
      const ownerMap = new Map<string, OwnerSummary>();
      if (ownerIds.length > 0) {
        const { data: ownersData, error: ownersError } = await runUserDirectoryQuery(
          supabase,
          (source) => supabase.from(source).select('id,name,surname').in('id', ownerIds)
        );

        if (ownersError) {
          console.error('Error loading investment owners:', ownersError.message);
        } else {
          ((ownersData ?? []) as OwnerSummary[]).forEach((owner) => {
            ownerMap.set(owner.id, owner);
          });
        }
      }

      setActiveInvestments(
        investments.map((investment) => ({
          ...investment,
          ...(() => {
            const project = projectMap.get(investment.project_id) ?? null;
            const repaymentInstallments =
              investment.term_months ?? project?.installment_count ?? project?.term_months ?? 0;
            const projection =
              investment.projected_return_usdc != null && investment.projected_total_usdc != null
                ? {
                    projectedReturnUsdc: Number(investment.projected_return_usdc),
                    projectedTotalUsdc: Number(investment.projected_total_usdc),
                  }
                : calculateInvestmentProjection({
                    amountUsdc: Number(investment.amount ?? 0),
                    interestRateEa: Number(
                      investment.interest_rate_ea ?? project?.interest_rate ?? 0
                    ),
                    termMonths: Number(repaymentInstallments),
                  });

            return {
              projected_return_usdc: projection.projectedReturnUsdc,
              projected_total_usdc: projection.projectedTotalUsdc,
              interest_rate_ea: investment.interest_rate_ea ?? project?.interest_rate ?? null,
              term_months: repaymentInstallments || null,
              };
          })(),
          project: projectMap.get(investment.project_id) ?? null,
          ownerName: (() => {
            const ownerId = projectMap.get(investment.project_id)?.owner_user_id;
            const owner = ownerId ? ownerMap.get(ownerId) : undefined;
            const fullName = `${owner?.name ?? ''} ${owner?.surname ?? ''}`.trim();
            if (fullName) return fullName;
            return t('businessOwner');
          })(),
          nextRepaymentLabel: formatNextRepaymentDate(
            getNextRepaymentDate(
              investment.created_at,
              investment.term_months ??
                projectMap.get(investment.project_id)?.installment_count ??
                projectMap.get(investment.project_id)?.term_months
            )
          ),
        }))
      );
      setLoadingActiveInvestments(false);
    };

    loadActiveInvestments();
    const interval = window.setInterval(loadActiveInvestments, HOME_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [getAccessToken, rolSeleccionado, supabase, t, user?.id, lastReceipt?.txHash]);

  useEffect(() => {
    const loadInternalBalance = async () => {
      if (!user?.id) {
        setInternalBalance(null);
        return;
      }

      const { data, error } = await fetchCurrentUserInternalLedger(getAccessToken, { limit: 8 });
      if (error) {
        console.error('Error loading internal ledger balance:', error);
        return;
      }

      setInternalBalance(data?.balance ?? null);
    };

    void loadInternalBalance();
    const interval = window.setInterval(loadInternalBalance, HOME_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [getAccessToken, user?.id, lastReceipt?.txHash]);

  useEffect(() => {
    const loadTransactions = async () => {
      if (!user?.id) {
        setTransactions([]);
        setLoadingTransactions(false);
        return;
      }

      setLoadingTransactions(true);
      const { data, error } = await fetchCurrentUserTransactions(getAccessToken, {
        limit: 12,
        wallet: smartWalletAddress ?? undefined,
      });

      if (error) {
        console.error('Error loading transactions:', error);
        setTransactions([]);
        setLoadingTransactions(false);
        return;
      }

      setTransactions(data ?? []);
      setLoadingTransactions(false);
    };

    loadTransactions();
    const interval = window.setInterval(loadTransactions, HOME_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [getAccessToken, user?.id, smartWalletAddress, lastReceipt?.txHash]);

  useEffect(() => {
    if (!showSearch) return;

    const normalizedQuery = normalizeSearchQuery(searchQuery);
    if (normalizedQuery.length < 2) {
      setSearchProjects([]);
      setSearchUsers([]);
      setSearchTransactions([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    let isCancelled = false;
    const timeout = window.setTimeout(async () => {
      const searchTerm = sanitizeSearchFragment(normalizedQuery);

      setSearching(true);
      setSearchError(null);

      try {
        const [projectsResponse, usersResponse] = await Promise.all([
          fetchProjects(
            {
              search: searchTerm,
              includeOwnedHidden: true,
              limit: 6,
            },
            getAccessToken
          ),
          fetchRecipientDirectory(getAccessToken, {
            search: searchTerm,
            limit: 6,
          }),
        ]);

        if (projectsResponse.error) {
          throw new Error(projectsResponse.error);
        }

        if (usersResponse.error) {
          throw new Error(usersResponse.error);
        }

        const currentUserId = user?.id ?? null;
        const visibleProjects = ((projectsResponse.data ?? []) as SearchProjectRow[])
          .map((project) => ({ ...project, id: String(project.id) }))
          .filter((project) => {
            const isOwnedByCurrentUser =
              Boolean(currentUserId) &&
              [project.owner_user_id, project.owner_id].filter(Boolean).includes(currentUserId);
            return isOwnedByCurrentUser || isProjectPubliclyVisible(project);
          })
          .slice(0, 6);

        const rawUsers = [...((usersResponse.data ?? []) as SearchUserRow[])];

        if (user?.id) {
          const { data: userTransactions, error: userTransactionsError } =
            await fetchCurrentUserTransactions(getAccessToken, {
              limit: 200,
              wallet: smartWalletAddress ?? undefined,
            });

          if (userTransactionsError) {
            throw new Error(userTransactionsError);
          }

          const currentWallet = smartWalletAddress?.toLowerCase() ?? '';
          const seenWallets = new Set<string>();
          const counterpartyWallets: string[] = [];

          (userTransactions ?? []).forEach((transaction) => {
            const wallets = [transaction.from_wallet, transaction.to_wallet]
              .filter((wallet): wallet is string => Boolean(wallet))
              .filter((wallet) => wallet.toLowerCase() !== currentWallet);

            wallets.forEach((wallet) => {
              const normalizedWallet = wallet.toLowerCase();
              if (seenWallets.has(normalizedWallet)) return;
              seenWallets.add(normalizedWallet);
              counterpartyWallets.push(wallet);
            });
          });

          if (counterpartyWallets.length > 0) {
            const { data: contactProfiles, error: contactProfilesError } =
              await fetchRecipientDirectory(getAccessToken, {
                wallets: counterpartyWallets.slice(0, 50),
                limit: 50,
              });

            if (contactProfilesError) {
              throw new Error(contactProfilesError);
            }

            const existingUserIds = new Set(rawUsers.map((entry) => entry.id));
            ((contactProfiles ?? []) as SearchUserRow[])
              .filter((entry) => matchesSearchUser(entry, normalizedQuery))
              .forEach((entry) => {
                if (existingUserIds.has(entry.id)) return;
                existingUserIds.add(entry.id);
                rawUsers.push(entry);
              });
          }
        }

        const userIds = rawUsers.map((entry) => entry.id);
        const userProjectMap = new Map<string, string>();

        if (userIds.length > 0) {
          const { data: ownerProjects, error: ownerProjectsError } = await fetchProjects(
            {
              ownerIds: userIds.join(','),
              limit: Math.max(6, userIds.length * 2),
            },
            getAccessToken
          );

          if (ownerProjectsError) {
            throw new Error(ownerProjectsError);
          }

          const candidateProjects = ((ownerProjects ?? []) as SearchProjectRow[])
            .map((project) => ({
              ...project,
              id: String(project.id),
            }))
            .filter((project) => isProjectPubliclyVisible(project));

          candidateProjects.forEach((project) => {
            [project.owner_user_id, project.owner_id].filter(Boolean).forEach((ownerId) => {
              if (!userProjectMap.has(ownerId as string)) {
                userProjectMap.set(ownerId as string, project.id);
              }
            });
          });
        }

        let transactionMatches: SearchTransactionResult[] = [];
        if (user?.id) {
          const { data, error } = await fetchCurrentUserTransactions(getAccessToken, {
            limit: 4,
            search: searchTerm,
          });

          if (error) {
            throw new Error(error);
          }

          transactionMatches = (data ?? []).map((entry) => ({
            id: String(entry.id),
            txHash: entry.tx_hash ?? null,
            createdAt: entry.created_at,
            movementType: entry.movement_type ?? 'transfer',
            amount: entry.amount,
          }));
        }

        if (isCancelled) return;

        setSearchProjects(
          visibleProjects.map((project) => ({
            id: project.id,
            title: project.business_name || project.title || t('ventureNumber', { id: project.id }),
            subtitle: t('raisedOf', {
              raised: formatMoney(project.amount_received ?? 0, project.currency ?? 'USD'),
              goal: formatMoney(project.amount_requested ?? 0, project.currency ?? 'USD'),
            }),
            imageUrl: project.photo_urls?.[0] ?? null,
          }))
        );

        setSearchUsers(
          rawUsers.map((entry) => ({
            id: entry.id,
            displayName: getUserDisplayName(entry),
            subtitle: entry.email?.trim() || t('emailPending'),
            avatarUrl: entry.avatar_url ?? null,
            walletAddress: entry.wallet_address ?? null,
            linkedProjectId: userProjectMap.get(entry.id) ?? null,
          }))
        );

        setSearchTransactions(transactionMatches);
      } catch (error) {
        if (isCancelled) return;
        setSearchProjects([]);
        setSearchUsers([]);
        setSearchTransactions([]);
        setSearchError(error instanceof Error ? error.message : t('searchError'));
      } finally {
        if (!isCancelled) {
          setSearching(false);
        }
      }
    }, 260);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeout);
    };
  }, [getAccessToken, searchQuery, showSearch, smartWalletAddress, supabase, t, user?.id]);

  const handleTopUpClick = useCallback(async () => {
    if (openingTopUp) return;

    setOpeningTopUp(true);
    try {
      await abrirCompra();
    } finally {
      setOpeningTopUp(false);
    }
  }, [abrirCompra, openingTopUp]);

  const topUpRequested = searchParams.get('topup') === '1';

  useEffect(() => {
    if (!topUpRequested || handledTopUpRequestRef.current) return;

    handledTopUpRequestRef.current = true;
    router.replace('/home', { scroll: false });
    void handleTopUpClick();
  }, [handleTopUpClick, router, topUpRequested]);

  const handleWithdrawClick = async () => {
    if (checkingWithdrawRequirements) return;

    if (!user?.id) {
      router.push('/login');
      return;
    }

    setCheckingWithdrawRequirements(true);

    try {
      const { data, error } = await fetchCurrentUserKycSummary(getAccessToken);

      if (error || !data) {
        setWithdrawKycLevelLabel('');
        setMissingWithdrawProfileFields([]);
        setShowWithdrawProfilePrompt(true);
        return;
      }

      setWithdrawKycLevelLabel(getKycLevelBadgeLabel(data.approvedLevel));

      if (data.canAccessWithdraw) {
        setShowWithdrawProfilePrompt(false);
        setMissingWithdrawProfileFields([]);
        router.push('/withdraw');
        return;
      }

      setMissingWithdrawProfileFields(data.missingForCurrentLevel);
      setShowWithdrawProfilePrompt(true);
    } finally {
      setCheckingWithdrawRequirements(false);
    }
  };

  const displayName = useMemo(() => profileName || userAlias || t('user'), [profileName, t, userAlias]);
  const trimmedSearchQuery = normalizeSearchQuery(searchQuery);
  const totalSearchResults = searchProjects.length + searchUsers.length + searchTransactions.length;
  const roleLabel =
    rolSeleccionado === 'emprendedor'
      ? roleT('entrepreneur')
      : rolSeleccionado === 'inversor'
        ? roleT('investor')
        : t('user');
  const sectionTitle = rolSeleccionado === 'emprendedor' ? t('myBusiness') : t('activeInvestments');
  const sectionActionLabel = rolSeleccionado === 'emprendedor' ? t('edit') : t('viewAll');
  const sectionActionHref =
    rolSeleccionado === 'emprendedor' && lastProject ? `/publish?edit=${lastProject.id}` : '/portfolio';
  const investorEarnings = activeInvestments.reduce(
    (sum, investment) => sum + Number(investment.projected_return_usdc ?? 0),
    0
  );
  const investorAverageRate =
    activeInvestments.length > 0
      ? activeInvestments.reduce(
          (sum, investment) => sum + Number(investment.interest_rate_ea ?? 0),
          0
        ) / activeInvestments.length
      : 0;
  const fundingProgress = calculateFundingProgress(lastProject?.amount_received ?? 0, lastProject?.amount_requested ?? 0);
  const internalBalanceHold = Number(internalBalance?.locked_balance ?? 0) + Number(
    internalBalance?.pending_balance ?? 0
  );
  const availableBalanceLabel = Math.max(Number(balanceUSDC ?? 0) - internalBalanceHold, 0).toFixed(2);
  const balanceCurrencyLabel = internalBalance?.currency ?? 'USD';

  const actions: ActionItem[] = [
    { label: t('topUp'), icon: <IconPlus />, onClick: () => void handleTopUpClick() },
    { label: t('sendMoney'), icon: <IconSend />, onClick: () => router.push('/invest') },
    { label: t('withdraw'), icon: <IconDownload />, onClick: handleWithdrawClick },
    { label: t('history'), icon: <IconClock />, onClick: () => router.push('/history') },
  ];

  const closeSearch = () => {
    setShowSearch(false);
    setSearchError(null);
    setSearching(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchProjects([]);
    setSearchUsers([]);
    setSearchTransactions([]);
    setSearchError(null);
    setSearching(false);
  };

  const closeAndClearSearch = () => {
    closeSearch();
    clearSearch();
  };

  const openSearchProject = (id: string) => {
    closeAndClearSearch();
    router.push(`/feed/${id}`);
  };

  const openSearchUser = (entry: SearchUserResult) => {
    const userHref = entry.linkedProjectId
      ? `/feed/${entry.linkedProjectId}`
      : entry.walletAddress
        ? `/invest/wallet?mode=transfer${
            entry.subtitle && entry.subtitle !== t('emailPending')
              ? `&email=${encodeURIComponent(entry.subtitle)}`
              : ''
          }&wallet=${encodeURIComponent(entry.walletAddress)}`
        : null;

    if (!userHref) return;
    closeAndClearSearch();
    router.push(userHref);
  };

  const openSearchTransaction = (id: string) => {
    closeAndClearSearch();
    router.push(`/history?q=${encodeURIComponent(id)}`);
  };

  const openProject = (projectId: string) => {
    router.push(`/feed/${projectId}`);
  };

  const deleteProject = async (projectId: string) => {
    if (deletingProjectId) return;

    const project = lastProject?.id === projectId ? lastProject : null;
    if (!project) return;

    if (!canDeleteProject(project)) {
      window.alert('This publication already has funding and cannot be deleted.');
      return;
    }

    const confirmed = window.confirm('Delete this publication? This action cannot be undone.');
    if (!confirmed) return;

    setDeletingProjectId(projectId);

    try {
      const { error } = await deleteCurrentUserProject(getAccessToken, projectId);

      if (error) {
        window.alert(`Could not delete publication: ${error}`);
        return;
      }

      setLastProject(null);
      setSearchProjects((currentProjects) =>
        currentProjects.filter((searchProject) => searchProject.id !== projectId)
      );
    } finally {
      setDeletingProjectId(null);
    }
  };

  const openPortfolio = () => {
    router.push('/portfolio');
  };

  const openHistory = () => {
    router.push('/history');
  };

  return (
    <>
      <DesktopHomeDashboard
        actions={actions}
        activeInvestments={activeInvestments}
        availableBalanceLabel={availableBalanceLabel}
        avatarUrl={avatarUrl}
        balanceCurrencyLabel={balanceCurrencyLabel}
        deletingProjectId={deletingProjectId}
        displayName={displayName}
        fundingProgress={fundingProgress}
        investorAverageRate={investorAverageRate}
        investorEarnings={investorEarnings}
        lastProject={lastProject}
        loadingActiveInvestments={loadingActiveInvestments}
        loadingProfileSummary={loadingProfileSummary}
        loadingProject={loadingProject}
        loadingTransactions={loadingTransactions}
        notificationsEnabled={notificationsEnabled}
        onBellClick={() => router.push('/notifications')}
        onClearSearch={clearSearch}
        onCloseSearch={closeSearch}
        onDeleteProject={(projectId) => void deleteProject(projectId)}
        onOpenHistory={openHistory}
        onOpenPortfolio={openPortfolio}
        onOpenProject={openProject}
        onOpenSearchProject={openSearchProject}
        onOpenSearchTransaction={openSearchTransaction}
        onOpenSearchUser={openSearchUser}
        role={rolSeleccionado}
        roleLabel={roleLabel}
        searchError={searchError}
        searchProjects={searchProjects}
        searchQuery={searchQuery}
        searching={searching}
        searchTransactions={searchTransactions}
        searchUsers={searchUsers}
        setSearchQuery={setSearchQuery}
        setShowSearch={setShowSearch}
        showBalance={showBalance}
        showSearch={showSearch}
        smartWalletAddress={smartWalletAddress}
        totalSearchResults={totalSearchResults}
        transactions={transactions}
        unreadNotificationsCount={unreadNotificationsCount}
        onToggleBalance={() => setShowBalance((prev) => !prev)}
      />

    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.12),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_52%,#F8F9FD_100%)] pb-36 text-[#101828] lg:hidden">
      <div className="pointer-events-none absolute left-1/2 top-[-9rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-56 h-64 w-64 rounded-full bg-[#B9A8FF]/16 blur-3xl" />

      <div className="relative mx-auto w-full max-w-xl px-4 pb-8 pt-10 sm:px-5">
        <header className="mb-6 flex items-center gap-4 px-1">
          <div className="flex items-center gap-0.5 text-[2rem] font-semibold tracking-[-0.07em] text-[#1C2336]">
            <span>Invest</span>
            <span className="text-[#6B39F4]">App</span>
            <span className="ml-0.5 mt-0.5 h-3 w-3 rounded-full bg-[#6B39F4]" />
          </div>
        </header>

        <section className="mb-6 rounded-[32px] border border-white/85 bg-white/88 p-4 shadow-[0_24px_70px_rgba(31,38,64,0.10)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-[#F4F0FF] shadow-[0_14px_30px_rgba(31,38,64,0.12)] ring-1 ring-[#DFD8FF]">
                {avatarUrl ? (
                  <span
                    className="block h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${avatarUrl})` }}
                  />
                ) : loadingProfileSummary ? (
                  <div className="h-full w-full animate-pulse bg-[#ECE7FF]" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#6B39F4]">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[2px] border-white bg-[#6B39F4]" />
              </div>
              <div className="min-w-0">
                <p className="text-[1rem] font-medium tracking-[-0.03em] text-[#7A8497]">
                  Hello, {roleLabel}
                </p>
                <h1 className="truncate text-[1.35rem] font-semibold tracking-[-0.055em] text-[#11182F]">
                  {displayName}
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <button
                type="button"
                aria-label={t('searchAria')}
                onClick={() => {
                  if (showSearch) {
                    setShowSearch(false);
                    setSearchQuery('');
                    setSearchError(null);
                    setSearchProjects([]);
                    setSearchUsers([]);
                    setSearchTransactions([]);
                    setSearching(false);
                    return;
                  }
                  setShowSearch(true);
                }}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#EEF0F8] bg-white/90 text-[#11182F] shadow-[0_12px_26px_rgba(31,38,64,0.08)] transition hover:-translate-y-0.5 hover:text-[#6B39F4]"
              >
                <IconSearch />
              </button>
              <button
                type="button"
                aria-label={t('notificationsAria')}
                onClick={() => router.push('/notifications')}
                className={`relative flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-xl shadow-[0_12px_26px_rgba(31,38,64,0.08)] transition hover:-translate-y-0.5 ${
                  notificationsEnabled
                    ? 'border-[#EEF0F8] bg-white/90 text-[#11182F] hover:text-[#6B39F4]'
                    : 'border-[#F6B7C3] bg-[#FFF1F3] text-[#DF1C41]'
                }`}
              >
                <IconBell />
                {unreadNotificationsCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#6B39F4] px-1 text-[10px] font-semibold text-white">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

        {showSearch ? (
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3 rounded-[24px] border border-[#EEF0F8] bg-white/86 px-4 py-3 shadow-[0_14px_30px_rgba(31,38,64,0.07)] backdrop-blur-xl">
              <span className="text-[#818898]">
                <IconSearch />
              </span>
              <input
                type="text"
                value={searchQuery}
                autoFocus
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('searchPlaceholder')}
                className="flex-1 bg-transparent text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="rounded-full px-2 py-1 text-xs font-semibold text-[#6B39F4]"
                >
                  {t('clear')}
                </button>
              ) : null}
            </div>

            <div className="max-h-[360px] overflow-y-auto rounded-[24px] border border-[#EEF0F8] bg-white/90 p-4 shadow-[0_18px_38px_rgba(31,38,64,0.08)] backdrop-blur-xl">
              {trimmedSearchQuery.length < 2 ? (
                <p className="text-sm text-[#818898]">
                  {t('mobileSearchHint')}
                </p>
              ) : searching ? (
                <p className="text-sm text-[#818898]">{t('searching')}</p>
              ) : searchError ? (
                <p className="text-sm text-[#DF1C41]">{t('searchError')}</p>
              ) : totalSearchResults === 0 ? (
                <p className="text-sm text-[#818898]">
                  {t('noMatches', { query: trimmedSearchQuery })}
                </p>
              ) : (
                <div className="space-y-5">
                  {searchProjects.length > 0 ? (
                    <section className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B39F4]/70">
                        {t('ventures')}
                      </p>
                      <div className="space-y-2">
                        {searchProjects.map((project) => (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => {
                              setShowSearch(false);
                              setSearchQuery('');
                              router.push(`/feed/${project.id}`);
                            }}
                            className="flex w-full items-center gap-3 rounded-[18px] border border-white/30 bg-white/70 px-3 py-3 text-left transition hover:bg-white"
                          >
                            {project.imageUrl ? (
                              <span
                                className="h-12 w-12 shrink-0 rounded-[14px] bg-cover bg-center"
                                style={{ backgroundImage: `url(${project.imageUrl})` }}
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#EEF2FF] text-xs font-semibold text-[#6B39F4]">
                                #{project.id}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#0F172A]">{project.title}</p>
                              <p className="truncate text-xs text-[#818898]">{project.subtitle}</p>
                            </div>
                            <span className="text-xs font-semibold text-[#6B39F4]">{t('open')}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {searchUsers.length > 0 ? (
                    <section className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B39F4]/70">
                        {t('people')}
                      </p>
                      <div className="space-y-2">
                        {searchUsers.map((entry) => {
                          const userHref = entry.linkedProjectId
                            ? `/feed/${entry.linkedProjectId}`
                            : entry.walletAddress
                              ? `/invest/wallet?mode=transfer${
                                  entry.subtitle && entry.subtitle !== t('emailPending')
                                    ? `&email=${encodeURIComponent(entry.subtitle)}`
                                    : ''
                                }&wallet=${encodeURIComponent(entry.walletAddress)}`
                              : null;

                          return userHref ? (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => {
                                setShowSearch(false);
                                setSearchQuery('');
                                router.push(userHref);
                              }}
                              className="flex w-full items-center gap-3 rounded-[18px] border border-white/30 bg-white/70 px-3 py-3 text-left transition hover:bg-white"
                            >
                              {entry.avatarUrl ? (
                                <span
                                  className="h-11 w-11 shrink-0 rounded-full bg-cover bg-center"
                                  style={{ backgroundImage: `url(${entry.avatarUrl})` }}
                                />
                              ) : (
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2FF] text-sm font-semibold text-[#6B39F4]">
                                  {entry.displayName.slice(0, 1).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-[#0F172A]">
                                  {entry.displayName}
                                </p>
                                <p className="truncate text-xs text-[#818898]">{entry.subtitle}</p>
                              </div>
                              <span className="text-xs font-semibold text-[#6B39F4]">
                                {entry.linkedProjectId ? t('venture') : t('send')}
                              </span>
                            </button>
                          ) : (
                            <div
                              key={entry.id}
                              className="flex items-center gap-3 rounded-[18px] border border-white/30 bg-white/60 px-3 py-3"
                            >
                              {entry.avatarUrl ? (
                                <span
                                  className="h-11 w-11 shrink-0 rounded-full bg-cover bg-center"
                                  style={{ backgroundImage: `url(${entry.avatarUrl})` }}
                                />
                              ) : (
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2FF] text-sm font-semibold text-[#6B39F4]">
                                  {entry.displayName.slice(0, 1).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-[#0F172A]">
                                  {entry.displayName}
                                </p>
                                <p className="truncate text-xs text-[#818898]">{entry.subtitle}</p>
                              </div>
                              <span className="text-[11px] font-medium text-[#94A3B8]">{t('profileMatch')}</span>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  {searchTransactions.length > 0 ? (
                    <section className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B39F4]/70">
                        {t('hashes')}
                      </p>
                      <div className="space-y-2">
                        {searchTransactions.map((transaction) => (
                          <button
                            key={transaction.id}
                            type="button"
                            onClick={() => {
                              setShowSearch(false);
                              setSearchQuery('');
                              router.push(
                                `/history?q=${encodeURIComponent(transaction.txHash ?? transaction.id)}`
                              );
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-[18px] border border-white/30 bg-white/70 px-3 py-3 text-left transition hover:bg-white"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#0F172A]">
                                {shortenIdentifier(transaction.txHash ?? transaction.id, 10)}
                              </p>
                              <p className="truncate text-xs text-[#818898]">
                                {transaction.movementType} · {formatTransactionDate(transaction.createdAt)}
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-[#6B39F4]">
                              {formatTransactionAmount(transaction.amount)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : null}

          <div className="relative mb-6 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#5E2CFF_0%,#4B27F0_52%,#334EFF_100%)] p-6 text-white shadow-[0_26px_56px_rgba(91,72,255,0.30)]">
            <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/16 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-4.5rem] left-[-3.5rem] h-44 w-44 rounded-full bg-[#9CF3E5]/12 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_30%,rgba(255,255,255,0.18),transparent_20%),linear-gradient(120deg,transparent_35%,rgba(255,255,255,0.10)_50%,transparent_68%)]" />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[1rem] font-medium tracking-[-0.03em] text-white/76">
                  {t('available')}
                </p>
                <h2 className="mt-2 text-[2.65rem] font-semibold leading-none tracking-[-0.07em]">
                  {showBalance ? `$${availableBalanceLabel}` : 'XXXX.XX'}{' '}
                  <span className="align-baseline text-[1.35rem] font-semibold tracking-[-0.04em] text-white/78">
                    {balanceCurrencyLabel}
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowBalance((prev) => !prev)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-xl transition hover:bg-white/24"
                aria-label={showBalance ? t('hideBalance') : t('showBalance')}
              >
                <IconEye hidden={!showBalance} />
              </button>
            </div>

            {rolSeleccionado === 'emprendedor' ? (
              <div className="relative mt-6 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full bg-[#EFFFF9]/95 px-5 py-2.5 text-[0.82rem] font-semibold tracking-[-0.02em] text-[#35A994] shadow-[0_16px_28px_rgba(14,165,143,0.12)]">
                <span>{t('raisedMetric', { value: formatMoney(lastProject?.amount_received ?? 0, lastProject?.currency ?? 'USD') })}</span>
                <span className="text-[#35A994]/45">&middot;</span>
                <span>{t('interestRateMetric', { value: lastProject?.interest_rate ? `${lastProject.interest_rate}%` : '--' })}</span>
              </div>
            ) : (
              <div className="relative mt-6 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full bg-[#EFFFF9]/95 px-5 py-2.5 text-[0.82rem] font-semibold tracking-[-0.02em] text-[#35A994] shadow-[0_16px_28px_rgba(14,165,143,0.12)]">
                <span>{t('activeMetric', { count: activeInvestments.length })}</span>
                <span className="text-[#35A994]/45">&middot;</span>
                <span>{t('avgRateMetric', { value: investorAverageRate ? `${investorAverageRate.toFixed(1)}%` : '--' })}</span>
                <span className="text-[#35A994]/45">&middot;</span>
                <span>{t('earningMetric', { value: formatMoney(investorEarnings, 'USD') })}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 items-start gap-2 text-center">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="group flex flex-col items-center gap-3 rounded-[22px] py-2 transition active:scale-[0.98]"
              >
                <div className="flex h-[66px] w-[66px] items-center justify-center rounded-full border border-white/85 bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F7FF_100%)] text-[#6B39F4] shadow-[0_18px_34px_rgba(31,38,64,0.08)] transition group-hover:-translate-y-0.5 group-hover:shadow-[0_22px_42px_rgba(107,57,244,0.14)]">
                  {action.icon}
                </div>
                <p className="text-[0.78rem] font-semibold tracking-[-0.03em] text-[#727B8E]">
                  {action.label}
                </p>
              </button>
            ))}
          </div>
        </section>

        {rolSeleccionado === 'inversor' ? (
        <section className="mb-7 rounded-[32px] border border-white/85 bg-white/88 p-4 shadow-[0_22px_58px_rgba(31,38,64,0.08)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[1.45rem] font-semibold tracking-[-0.06em] text-[#101828]">
              {sectionTitle}
            </h2>
            <button
              type="button"
              onClick={() => router.push(sectionActionHref)}
              className="text-[0.95rem] font-semibold tracking-[-0.03em] text-[#6B39F4] transition hover:text-[#4F27D8]"
            >
              {sectionActionLabel}
            </button>
          </div>

          <div className="space-y-5">
            {rolSeleccionado === 'inversor' ? (
              loadingActiveInvestments ? (
                <SectionLoadingSkeleton rows={2} />
              ) : activeInvestments.length > 0 ? (
                <div className="overflow-hidden rounded-[26px] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7F8FD_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <div className="mb-3 flex justify-end px-1">
                    <span className="text-[0.86rem] font-medium tracking-[-0.025em] text-[#8A93A6]">
                      Swipe to review
                    </span>
                  </div>
                  <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1">
                    {activeInvestments.slice(0, 5).map((investment) => {
                      const project = investment.project;
                      const projectTitle =
                        project?.business_name || project?.title || investment.project_title || 'Business';
                      const tone = getInvestmentHealthMeta(
                        getInvestmentHealth(
                          getNextRepaymentDate(investment.created_at, investment.term_months)
                        )
                      );
                      const nextRepaymentDate = getNextRepaymentDate(
                        investment.created_at,
                        investment.term_months
                      );
                      const statusClassName =
                        tone.label === 'Up to date'
                          ? 'border-[#40C4AA]/35 text-[#1A8E78]'
                          : tone.label === 'Due soon'
                            ? 'border-[#FFBE4C]/35 text-[#C77C00]'
                            : 'border-[#DF1C41]/25 text-[#DF1C41]';

                      return (
                        <div key={investment.id} className="min-w-full snap-center">
                          <InvestorWalletCard
                            statusLabel={tone.label}
                            statusClassName={statusClassName}
                            businessName={projectTitle}
                            thumbnailUrl={project?.photo_urls?.[0] ?? null}
                            investmentId={investment.id}
                            ownerName={investment.ownerName}
                            nextRepayment={formatInvestmentCardDate(nextRepaymentDate)}
                            amountLabel={formatInvestmentCardAmount(investment.amount ?? 0)}
                            onClick={() => router.push(`/feed/${investment.project_id}`)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-[#EEF0F8] bg-white/74 p-5 text-sm text-[#818898] shadow-[0_12px_28px_rgba(31,38,64,0.05)]">
                  You do not have active investments yet.
                </div>
              )
            ) : (
              <>
                {loadingProject ? (
                  <SectionLoadingSkeleton rows={2} />
                ) : lastProject ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/feed/${lastProject.id}`)}
                    className="w-full overflow-hidden rounded-[26px] border border-[#EEF0F8] bg-white/88 text-left shadow-[0_18px_42px_rgba(31,38,64,0.08)] transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    {lastProject.photo_urls?.[0] ? (
                      <span
                        className="block h-36 w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${lastProject.photo_urls[0]})` }}
                      />
                    ) : (
                      <div className="flex h-36 w-full items-center justify-center bg-[#F4F0FF] text-xs text-[#818898]">
                        No image
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-[1rem] font-semibold tracking-[-0.035em] text-[#101828]">
                        {lastProject.title}
                      </p>
                      <p className="mt-1 text-xs text-[#818898]">
                        {`Raised ${formatMoney(lastProject.amount_received ?? 0, lastProject.currency ?? 'USD')} of ${formatMoney(lastProject.amount_requested ?? 0, lastProject.currency ?? 'USD')}`}
                      </p>
                      <div className="mt-4 h-2 rounded-full bg-slate-200/80">
                        <div className="h-2 rounded-full bg-[#6B39F4]" style={{ width: `${fundingProgress}%` }} />
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-[#6B39F4]">
                          {lastProject.interest_rate ? `${lastProject.interest_rate}% interest` : 'Interest pending'}
                        </p>
                        <span className="rounded-full border border-[#D3C4FC] px-3 py-1 text-[11px] font-semibold text-[#6B39F4]">
                          Details
                        </span>
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="rounded-[24px] border border-[#EEF0F8] bg-white/74 p-5 text-sm text-[#818898] shadow-[0_12px_28px_rgba(31,38,64,0.05)]">
                    Your listings will appear here once they are active.
                  </div>
                )}
              </>
            )}

            {rolSeleccionado === 'inversor' ? (
              <button
                type="button"
                onClick={() => router.push('/feed')}
                className="w-full rounded-[22px] border-2 border-dashed border-[#C9B8FF] bg-white/45 py-4 text-[1rem] font-semibold tracking-[-0.035em] text-[#6B39F4] transition hover:border-[#9B7CFF] hover:bg-[#F8F5FF] active:scale-[0.99]"
              >
                + Invest in a new venture
              </button>
            ) : null}
          </div>
        </section>
        ) : null}

        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="text-[1.45rem] font-semibold tracking-[-0.06em] text-[#101828]">
              Transactions
            </h2>
            <button
              type="button"
              onClick={() => router.push('/history')}
              className="text-[0.95rem] font-semibold tracking-[-0.03em] text-[#6B39F4] transition hover:text-[#4F27D8]"
            >
              View all
            </button>
          </div>

          <div className="max-h-[288px] space-y-3 overflow-y-auto pb-2">
            {loadingTransactions ? (
              <SectionLoadingSkeleton rows={3} />
            ) : null}

            {!loadingTransactions && transactions.length === 0 ? (
              <div className="rounded-[24px] border border-white/85 bg-white/88 px-4 py-5 text-sm text-[#818898] shadow-[0_16px_34px_rgba(31,38,64,0.06)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-xl">
                Your activity will appear here.
              </div>
            ) : null}

            {!loadingTransactions
              ? transactions.map((transaction) => {
                  const incoming = isIncomingTransaction(transaction, smartWalletAddress);
                  const amountColor = incoming ? 'text-[#24A979]' : 'text-[#E33A24]';
                  const amountPrefix = incoming ? '+' : '-';

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between gap-4 rounded-[24px] border border-white/85 bg-white/88 px-4 py-3.5 shadow-[0_16px_34px_rgba(31,38,64,0.06)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-xl"
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-[2px] border-white bg-[#F4F0FF] shadow-[0_12px_24px_rgba(31,38,64,0.08)]">
                          {avatarUrl ? (
                            <span
                              className="block h-full w-full bg-cover bg-center"
                              style={{ backgroundImage: `url(${avatarUrl})` }}
                            />
                          ) : loadingProfileSummary ? (
                            <div className="h-full w-full animate-pulse bg-[#ECE7FF]" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#6B39F4]">
                              {displayName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[0.98rem] font-semibold tracking-[-0.035em] text-[#101828]">
                            {displayName}
                          </p>
                          <p className="text-[0.84rem] capitalize tracking-[-0.025em] text-[#8A93A6]">
                            {getTransactionTypeLabel(transaction, smartWalletAddress)}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className={`text-[0.95rem] font-semibold tracking-[-0.035em] ${amountColor}`}>
                          {amountPrefix}
                          {formatTransactionAmount(transaction.amount)}
                        </p>
                        <p className="mt-1 text-[0.78rem] font-medium tracking-[-0.025em] text-[#8A93A6]">
                          {formatTransactionDate(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              : null}
          </div>
        </section>

      </div>

      <BottomNav />

      {showWithdrawProfilePrompt ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] border border-white/25 bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(238,244,255,0.86))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#DF1C41]">
                  Withdraw locked
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#0F172A]">
                  Complete your KYC level first
                </h3>
                <p className="mt-2 text-sm text-[#666D80]">
                  Before making a withdrawal, your account must satisfy the required KYC
                  compliance tier for its movement volume.
                </p>
                {withdrawKycLevelLabel ? (
                  <p className="mt-2 inline-flex rounded-full border border-[#9FE3BE] bg-[#E8F9F1] px-2.5 py-1 text-xs font-semibold text-[#14845A]">
                    {withdrawKycLevelLabel}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawProfilePrompt(false)}
                className="rounded-full border border-white/40 bg-white/70 px-3 py-1 text-sm font-semibold text-[#0F172A]"
                aria-label={t('closeProfilePrompt')}
              >
                Close
              </button>
            </div>

            {missingWithdrawProfileFields.length > 0 ? (
              <div className="mt-5 rounded-[20px] border border-[#F6B7C3] bg-[#FFF1F3] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#DF1C41]">
                  Missing requirements
                </p>
                <p className="mt-2 text-sm text-[#7A2033]">
                  {missingWithdrawProfileFields.join(', ')}
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-[20px] border border-[#F6B7C3] bg-[#FFF1F3] px-4 py-4 text-sm text-[#7A2033]">
                We could not verify your KYC status right now, so please review your personal data
                and compliance documents before requesting a withdrawal.
              </div>
            )}

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setShowWithdrawProfilePrompt(false);
                  router.push('/profile/personal-data');
                }}
                className="w-full rounded-[18px] bg-[#6B39F4] px-4 py-4 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(107,57,244,0.24)] transition hover:bg-[#5B31CF]"
              >
                Review Personal Data
              </button>
              <button
                type="button"
                onClick={() => setShowWithdrawProfilePrompt(false)}
                className="w-full rounded-[18px] border border-white/35 bg-white/80 px-4 py-4 text-sm font-semibold text-[#0F172A] transition hover:bg-white"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
    </>
  );
}
