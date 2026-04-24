'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import BottomNav from '@/components/BottomNav';
import InvestorWalletCard from '@/components/InvestorWalletCard';
import {
  formatNextRepaymentDate,
  getInvestmentHealth,
  getInvestmentHealthMeta,
  getNextRepaymentDate,
} from '@/lib/investor-overview';
import { calculateInvestmentProjection } from '@/lib/investment-math';
import { useInvestApp } from '@/lib/investapp-context';
import { HOME_REFRESH_INTERVAL_MS, isProjectPubliclyVisible } from '@/lib/project-status';
import { fetchCurrentUserInternalLedger } from '@/utils/client/current-user-internal-ledger';
import { fetchCurrentUserInvestments } from '@/utils/client/current-user-investments';
import { fetchCurrentUserKycSummary } from '@/utils/client/current-user-kyc';
import { fetchCurrentUserProjects } from '@/utils/client/current-user-projects';
import { fetchProjects } from '@/utils/client/projects';
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

type ActionItem = {
  label: string;
  icon: React.ReactNode;
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
  if (amount == null) return '0.00 USDC';
  return `${Number(amount).toFixed(2)} USDC`;
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
  if (user.wallet_address) return shortenIdentifier(user.wallet_address, 5);
  return shortenIdentifier(user.id, 8) || 'User';
};

export default function HomePage() {
  const router = useRouter();
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
            return 'Business owner';
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
  }, [getAccessToken, rolSeleccionado, supabase, user?.id, lastReceipt?.txHash]);

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
      const wildcardTerm = `%${searchTerm.replace(/\s+/g, '%')}%`;

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
          runUserDirectoryQuery(supabase, (source) =>
            supabase
              .from(source)
              .select('id,name,surname,avatar_url,wallet_address,role')
              .or(
                [
                  `name.ilike.${wildcardTerm}`,
                  `surname.ilike.${wildcardTerm}`,
                  `id.ilike.${wildcardTerm}`,
                  `wallet_address.ilike.${wildcardTerm}`,
                ].join(',')
              )
              .limit(6)
          ),
        ]);

        if (projectsResponse.error) {
          throw new Error(projectsResponse.error);
        }

        if (usersResponse.error) {
          throw usersResponse.error;
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

        const rawUsers = (usersResponse.data ?? []) as SearchUserRow[];
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
            title: project.business_name || project.title || `Venture #${project.id}`,
            subtitle: `${formatMoney(project.amount_received ?? 0, project.currency ?? 'USD')} raised of ${formatMoney(
              project.amount_requested ?? 0,
              project.currency ?? 'USD'
            )}`,
            imageUrl: project.photo_urls?.[0] ?? null,
          }))
        );

        setSearchUsers(
          rawUsers.map((entry) => ({
            id: entry.id,
            displayName: getUserDisplayName(entry),
            subtitle:
              entry.wallet_address ??
              shortenIdentifier(entry.id, 10) ??
              'User profile',
            avatarUrl: entry.avatar_url ?? null,
            linkedProjectId: userProjectMap.get(entry.id) ?? null,
          }))
        );

        setSearchTransactions(transactionMatches);
      } catch (error) {
        if (isCancelled) return;
        setSearchProjects([]);
        setSearchUsers([]);
        setSearchTransactions([]);
        setSearchError(error instanceof Error ? error.message : 'We could not load search results.');
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
  }, [getAccessToken, searchQuery, showSearch, supabase, user?.id]);

  const handleTopUpClick = async () => {
    if (openingTopUp) return;

    setOpeningTopUp(true);
    try {
      await abrirCompra();
    } finally {
      setOpeningTopUp(false);
    }
  };

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

  const displayName = useMemo(() => profileName || userAlias || 'User', [profileName, userAlias]);
  const trimmedSearchQuery = normalizeSearchQuery(searchQuery);
  const totalSearchResults = searchProjects.length + searchUsers.length + searchTransactions.length;
  const roleLabel =
    rolSeleccionado === 'emprendedor'
      ? 'Entrepreneur'
      : rolSeleccionado === 'inversor'
        ? 'Investor'
        : 'User';
  const sectionTitle = rolSeleccionado === 'emprendedor' ? 'My Business' : 'Active investments';
  const sectionActionLabel = rolSeleccionado === 'emprendedor' ? 'Edit' : 'View all';
  const sectionActionHref =
    rolSeleccionado === 'emprendedor' && lastProject ? `/portfolio?edit=${lastProject.id}` : '/portfolio';
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
  const availableBalanceLabel = balanceUSDC;
  const balanceCurrencyLabel = internalBalance?.currency ?? 'USD';

  const actions: ActionItem[] = [
    { label: 'Top up', icon: <IconPlus />, onClick: () => void handleTopUpClick() },
    { label: 'Send', icon: <IconSend />, onClick: () => router.push('/invest') },
    { label: 'Withdraw', icon: <IconDownload />, onClick: handleWithdrawClick },
    { label: 'History', icon: <IconClock />, onClick: () => router.push('/history') },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.12),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_52%,#F8F9FD_100%)] pb-36 text-[#101828]">
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
                aria-label="Search"
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
                aria-label="Notifications"
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
                placeholder="Search by venture, user, wallet, DID or tx hash"
                className="flex-1 bg-transparent text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="rounded-full px-2 py-1 text-xs font-semibold text-[#6B39F4]"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="max-h-[360px] overflow-y-auto rounded-[24px] border border-[#EEF0F8] bg-white/90 p-4 shadow-[0_18px_38px_rgba(31,38,64,0.08)] backdrop-blur-xl">
              {trimmedSearchQuery.length < 2 ? (
                <p className="text-sm text-[#818898]">
                  Start typing to search ventures, people, wallet addresses, DIDs, project IDs, or
                  your transaction hashes.
                </p>
              ) : searching ? (
                <p className="text-sm text-[#818898]">Searching InvestApp...</p>
              ) : searchError ? (
                <p className="text-sm text-[#DF1C41]">We could not load search results right now.</p>
              ) : totalSearchResults === 0 ? (
                <p className="text-sm text-[#818898]">
                  No matches found for <span className="font-semibold text-[#0F172A]">{trimmedSearchQuery}</span>.
                </p>
              ) : (
                <div className="space-y-5">
                  {searchProjects.length > 0 ? (
                    <section className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B39F4]/70">
                        Ventures
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
                            <span className="text-xs font-semibold text-[#6B39F4]">Open</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {searchUsers.length > 0 ? (
                    <section className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B39F4]/70">
                        People
                      </p>
                      <div className="space-y-2">
                        {searchUsers.map((entry) =>
                          entry.linkedProjectId ? (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => {
                                setShowSearch(false);
                                setSearchQuery('');
                                router.push(`/feed/${entry.linkedProjectId}`);
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
                              <span className="text-xs font-semibold text-[#6B39F4]">Venture</span>
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
                              <span className="text-[11px] font-medium text-[#94A3B8]">Profile match</span>
                            </div>
                          )
                        )}
                      </div>
                    </section>
                  ) : null}

                  {searchTransactions.length > 0 ? (
                    <section className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B39F4]/70">
                        Hashes
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
                  Available
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
                aria-label={showBalance ? 'Hide balance' : 'Show balance'}
              >
                <IconEye hidden={!showBalance} />
              </button>
            </div>

            {rolSeleccionado === 'emprendedor' ? (
              <div className="relative mt-6 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full bg-[#EFFFF9]/95 px-5 py-2.5 text-[0.82rem] font-semibold tracking-[-0.02em] text-[#35A994] shadow-[0_16px_28px_rgba(14,165,143,0.12)]">
                <span>{`Raised: ${formatMoney(lastProject?.amount_received ?? 0, lastProject?.currency ?? 'USD')}`}</span>
                <span className="text-[#35A994]/45">&middot;</span>
                <span>{`Interest rate: ${lastProject?.interest_rate ? `${lastProject.interest_rate}%` : '--'}`}</span>
              </div>
            ) : (
              <div className="relative mt-6 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full bg-[#EFFFF9]/95 px-5 py-2.5 text-[0.82rem] font-semibold tracking-[-0.02em] text-[#35A994] shadow-[0_16px_28px_rgba(14,165,143,0.12)]">
                <span>{`Active: ${activeInvestments.length}`}</span>
                <span className="text-[#35A994]/45">&middot;</span>
                <span>{`Avg rate: ${investorAverageRate ? `${investorAverageRate.toFixed(1)}%` : '--'}`}</span>
                <span className="text-[#35A994]/45">&middot;</span>
                <span>{`Earning: ${formatMoney(investorEarnings, 'USD')}`}</span>
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
                <div className="rounded-[24px] border border-[#EEF0F8] bg-white/74 p-5 text-sm text-[#818898] shadow-[0_12px_28px_rgba(31,38,64,0.05)]">
                  Loading your active investments...
                </div>
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
                  <div className="rounded-[24px] border border-[#EEF0F8] bg-white/74 p-5 text-sm text-[#818898] shadow-[0_12px_28px_rgba(31,38,64,0.05)]">
                    Loading your latest listing...
                  </div>
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
              <div className="rounded-[24px] border border-white/85 bg-white/88 px-4 py-5 text-sm text-[#818898] shadow-[0_16px_34px_rgba(31,38,64,0.06)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-xl">
                Loading transactions...
              </div>
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
                aria-label="Close profile completion prompt"
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
  );
}
