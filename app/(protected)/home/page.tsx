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
import {
  detectInvestmentsSchema,
  detectTransactionsSchema,
  loadLegacyInvestmentsForInvestor,
  loadLegacyTransactionsForUser,
} from '@/lib/supabase-ledger-compat';
import { useInvestApp } from '@/lib/investapp-context';
import { HOME_REFRESH_INTERVAL_MS } from '@/lib/project-status';
import { getAmountValue, runWithAmountColumnFallback } from '@/lib/supabase-amount';
import { useUserProfileSummary } from '@/lib/use-user-profile-summary';

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

type TransactionRow = {
  id: string;
  created_at: string;
  movement_type: 'investment' | 'repayment' | 'transfer' | 'buy' | 'withdrawal';
  status: 'submitted' | 'confirmed' | 'failed';
  from_wallet: string | null;
  to_wallet: string | null;
  amount: number | null;
};

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

type RawTransactionRow = Omit<TransactionRow, 'amount'> & {
  amount?: number | null;
  amount_usdc?: number | null;
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
  email: string | null;
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
    abrirCompraCoinbase,
    abrirRetiro,
  } = useInvestApp();
  const { avatarUrl, displayName: profileName, loading: loadingProfileSummary } = useUserProfileSummary();
  const [showBalance, setShowBalance] = useState(true);
  const [lastProject, setLastProject] = useState<LastProject | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [activeInvestments, setActiveInvestments] = useState<HomeActiveInvestment[]>([]);
  const [loadingActiveInvestments, setLoadingActiveInvestments] = useState(false);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [showTopUpOptions, setShowTopUpOptions] = useState(false);
  const [openingTopUpProvider, setOpeningTopUpProvider] = useState<'current' | 'coinbase' | null>(
    null
  );

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
      const { data } = await supabase
        .from('projects')
        .select('id,title,amount_requested,amount_received,currency,photo_urls,created_at,interest_rate')
        .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(1);

      setLastProject((data ?? [])[0] ?? null);
      setLoadingProject(false);
    };

    loadLastProject();
    const interval = window.setInterval(loadLastProject, HOME_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [rolSeleccionado, supabase, user?.id, lastReceipt?.txHash]);

  useEffect(() => {
    const loadActiveInvestments = async () => {
      if (!user?.id || rolSeleccionado !== 'inversor') {
        setActiveInvestments([]);
        return;
      }

      setLoadingActiveInvestments(true);
      const investmentSchema = await detectInvestmentsSchema(supabase);
      let investments: ActiveInvestmentRow[] = [];

      if (investmentSchema === 'legacy') {
        const { data: legacyData, error: legacyError } = await loadLegacyInvestmentsForInvestor(
          supabase,
          user.id
        );

        if (legacyError) {
          console.error('Error loading active investments:', legacyError.message);
          setActiveInvestments([]);
          setLoadingActiveInvestments(false);
          return;
        }

        investments = legacyData.slice(0, 5).map((item) => ({
          id: item.id,
          created_at: item.created_at,
          project_id: item.project_id,
          project_title: null,
          amount: item.amount,
          interest_rate_ea: null,
          term_months: null,
          projected_return_usdc: null,
          projected_total_usdc: null,
          status: item.status,
        }));
      } else {
        const { data, error } = await runWithAmountColumnFallback((amountColumn) =>
          supabase
            .from('investments')
            .select(
              `id,created_at,project_id,project_title,${amountColumn},interest_rate_ea,term_months,projected_return_usdc,projected_total_usdc,status`
            )
            .eq('investor_user_id', user.id)
            .in('status', ['submitted', 'confirmed'])
            .order('created_at', { ascending: false })
            .limit(5)
        );

        if (error) {
          console.error('Error loading active investments:', error.message);
          setActiveInvestments([]);
          setLoadingActiveInvestments(false);
          return;
        }

        investments = ((data ?? []) as RawActiveInvestmentRow[])
          .filter((item) => item.id)
          .map((item) => ({
            ...item,
            amount: getAmountValue(item),
          })) as ActiveInvestmentRow[];
      }

      const projectIds = Array.from(
        new Set(investments.map((investment) => investment.project_id).filter(Boolean))
      );

      const projectMap = new Map<string, ProjectFundingSummary>();
      if (projectIds.length > 0) {
        const normalizedProjectIds = projectIds
          .map((projectId) => {
            const numericValue = Number(projectId);
            return Number.isFinite(numericValue) ? numericValue : projectId;
          });
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id,title,business_name,owner_user_id,amount_requested,amount_received,currency,photo_urls,interest_rate,term_months')
          .in('id', normalizedProjectIds);

        if (projectsError) {
          console.error('Error loading invested projects:', projectsError.message);
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
        const { data: ownersData, error: ownersError } = await supabase
          .from('users')
          .select('id,name,surname,email')
          .in('id', ownerIds);

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
                    termMonths: Number(investment.term_months ?? project?.term_months ?? 0),
                  });

            return {
              projected_return_usdc: projection.projectedReturnUsdc,
              projected_total_usdc: projection.projectedTotalUsdc,
              interest_rate_ea: investment.interest_rate_ea ?? project?.interest_rate ?? null,
              term_months: investment.term_months ?? project?.term_months ?? null,
              };
          })(),
          project: projectMap.get(investment.project_id) ?? null,
          ownerName: (() => {
            const ownerId = projectMap.get(investment.project_id)?.owner_user_id;
            const owner = ownerId ? ownerMap.get(ownerId) : undefined;
            const fullName = `${owner?.name ?? ''} ${owner?.surname ?? ''}`.trim();
            if (fullName) return fullName;
            if (owner?.email) return owner.email.split('@')[0];
            return 'Business owner';
          })(),
          nextRepaymentLabel: formatNextRepaymentDate(
            getNextRepaymentDate(investment.created_at, investment.term_months)
          ),
        }))
      );
      setLoadingActiveInvestments(false);
    };

    loadActiveInvestments();
    const interval = window.setInterval(loadActiveInvestments, HOME_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [rolSeleccionado, supabase, user?.id, lastReceipt?.txHash]);

  useEffect(() => {
    const loadTransactions = async () => {
      if (!user?.id && !smartWalletAddress) {
        setTransactions([]);
        return;
      }

      setLoadingTransactions(true);
      const transactionSchema = await detectTransactionsSchema(supabase);

      if (transactionSchema === 'legacy' && user?.id) {
        const { data: legacyData, error: legacyError } = await loadLegacyTransactionsForUser(
          supabase,
          user.id,
          12
        );

        if (legacyError) {
          console.error('Error loading transactions:', legacyError.message);
          setTransactions([]);
          setLoadingTransactions(false);
          return;
        }

        setTransactions(
          legacyData.map((item) => ({
            id: item.id,
            created_at: item.created_at,
            movement_type: item.movement_type as TransactionRow['movement_type'],
            status: item.status,
            from_wallet: item.from_wallet,
            to_wallet: item.to_wallet,
            amount: item.amount,
          }))
        );
        setLoadingTransactions(false);
        return;
      }

      const filters = [user?.id ? `user_id.eq.${user.id}` : null];
      if (smartWalletAddress) {
        filters.push(`from_wallet.eq.${smartWalletAddress}`);
        filters.push(`to_wallet.eq.${smartWalletAddress}`);
      }

      const { data, error } = await runWithAmountColumnFallback((amountColumn) =>
        supabase
          .from('transactions')
          .select(`id,created_at,movement_type,status,from_wallet,to_wallet,${amountColumn}`)
          .or(filters.filter(Boolean).join(','))
          .order('created_at', { ascending: false })
          .limit(12)
      );

      if (error) {
        console.error('Error loading transactions:', error.message);
        setTransactions([]);
        setLoadingTransactions(false);
        return;
      }

      setTransactions(
        ((data ?? []) as RawTransactionRow[])
          .filter((item) => item.id)
          .map((item) => ({
            ...item,
            amount: getAmountValue(item),
          })) as TransactionRow[]
      );
      setLoadingTransactions(false);
    };

    loadTransactions();
    const interval = window.setInterval(loadTransactions, HOME_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [supabase, user?.id, smartWalletAddress, lastReceipt?.txHash]);

  const handleOpenCurrentTopUp = async () => {
    setOpeningTopUpProvider('current');
    try {
      await abrirCompra();
      setShowTopUpOptions(false);
    } finally {
      setOpeningTopUpProvider(null);
    }
  };

  const handleOpenCoinbaseTopUp = async () => {
    setOpeningTopUpProvider('coinbase');
    try {
      await abrirCompraCoinbase();
      setShowTopUpOptions(false);
    } finally {
      setOpeningTopUpProvider(null);
    }
  };

  const displayName = useMemo(() => profileName || userAlias || 'User', [profileName, userAlias]);
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

  const actions: ActionItem[] = [
    { label: 'Top up', icon: <IconPlus />, onClick: () => setShowTopUpOptions(true) },
    { label: 'Send', icon: <IconSend />, onClick: () => router.push('/invest') },
    { label: 'Withdraw', icon: <IconDownload />, onClick: abrirRetiro },
    { label: 'History', icon: <IconClock />, onClick: () => router.push('/portfolio') },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto w-full max-w-[375px] rounded-[30px] border border-white/25 bg-white/20 px-6 pb-32 pt-8 backdrop-blur-md shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full border border-white/25 bg-white/20 backdrop-blur-md">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : loadingProfileSummary ? (
                <div className="h-full w-full animate-pulse bg-white/30" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#6B39F4]">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-[#818898]">Hello, {roleLabel}</p>
              <h1 className="text-xl font-semibold text-[#0F172A]">{displayName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Search"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/20 backdrop-blur-md text-[#0F172A] shadow-sm"
            >
              <IconSearch />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/20 backdrop-blur-md text-[#0F172A] shadow-sm"
            >
              <IconBell />
            </button>
          </div>
        </div>

      <div
        className="mb-6 rounded-[18px] bg-[#6B39F4] bg-cover bg-center p-6 text-white shadow-[0_20px_40px_rgba(107,57,244,0.25)]"
        style={{ backgroundImage: "url('/assets/slide1.jpg')" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-white/70">Available</p>
            <h2 className="mt-1 text-3xl font-bold">
              {showBalance ? `$${balanceUSDC}` : 'XXXX.XX'}{' '}
              <span className="text-lg font-semibold text-white/80">USD</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowBalance((prev) => !prev)}
            className="rounded-full bg-white/20 p-2 text-white"
            aria-label={showBalance ? 'Hide balance' : 'Show balance'}
          >
            <IconEye hidden={!showBalance} />
          </button>
        </div>

        {rolSeleccionado === 'emprendedor' ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#EFFEFA] px-3 py-1 text-xs font-semibold text-[#40C4AA]">
            <span>{`Raised: ${formatMoney(lastProject?.amount_received ?? 0, lastProject?.currency ?? 'USD')}`}</span>
            <span className="text-[#40C4AA]/60">&middot;</span>
            <span>{`Interest rate: ${lastProject?.interest_rate ? `${lastProject.interest_rate}%` : '--'}`}</span>
          </div>
        ) : (
          <div className="mt-4 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full bg-[#EFFEFA] px-3 py-1 text-xs font-semibold text-[#40C4AA]">
            <span>{`Active: ${activeInvestments.length}`}</span>
            <span className="text-[#40C4AA]/60">&middot;</span>
            <span>{`Avg rate: ${investorAverageRate ? `${investorAverageRate.toFixed(1)}%` : '--'}`}</span>
            <span className="text-[#40C4AA]/60">&middot;</span>
            <span>{`Earning: ${formatMoney(investorEarnings, 'USD')}`}</span>
          </div>
        )}
      </div>

      <div className="mb-8 grid grid-cols-4 gap-4 text-center">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-white/25 bg-white/20 backdrop-blur-md text-[#6B39F4] shadow-sm">
              {action.icon}
            </div>
            <p className="text-[11px] font-semibold text-[#666D80]">{action.label}</p>
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#0F172A]">{sectionTitle}</h2>
        <button
          type="button"
          onClick={() => router.push(sectionActionHref)}
          className="text-sm font-semibold text-[#6B39F4]"
        >
          {sectionActionLabel}
        </button>
      </div>

      <div className="space-y-4">
        {rolSeleccionado === 'inversor' ? (
          loadingActiveInvestments ? (
            <div className="rounded-[16px] border border-white/25 bg-white/20 p-5 text-sm text-[#818898] backdrop-blur-md">
              Loading your active investments...
            </div>
          ) : activeInvestments.length > 0 ? (
            <div className="overflow-hidden rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#818898]">
                  Investment cards
                </p>
                <span className="text-xs text-[#818898]">Swipe to review</span>
              </div>
              <div className="overflow-hidden pb-2">
                <div className="flex items-stretch pr-2">
                  {activeInvestments.slice(0, 5).map((investment, index) => {
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

                    return (
                      <div
                        key={investment.id}
                        className="relative shrink-0"
                        style={{
                          marginLeft: index === 0 ? 0 : -132,
                          zIndex: activeInvestments.length - index,
                        }}
                      >
                        <InvestorWalletCard
                          statusLabel={tone.label}
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
            </div>
          ) : (
            <div className="rounded-[16px] border border-white/25 bg-white/20 backdrop-blur-md p-5 text-sm text-[#818898]">
              You do not have active investments yet.
            </div>
          )
        ) : (
          <>
            {loadingProject ? (
              <div className="rounded-[16px] border border-white/25 bg-white/20 backdrop-blur-md p-5 text-sm text-[#818898]">
                Loading your latest listing...
              </div>
            ) : lastProject ? (
              <button
                type="button"
                onClick={() => router.push(`/feed/${lastProject.id}`)}
                className="w-full overflow-hidden rounded-[16px] border border-white/25 bg-white/20 text-left shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md transition hover:bg-white/25"
              >
                {lastProject.photo_urls?.[0] ? (
                  <img
                    src={lastProject.photo_urls[0]}
                    alt={lastProject.title}
                    className="h-32 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center border border-white/25 bg-white/20 backdrop-blur-md text-xs text-[#818898]">
                    No image
                  </div>
                )}
                <div className="p-4">
                  <p className="text-sm font-semibold text-[#0F172A]">{lastProject.title}</p>
                  <p className="mt-1 text-xs text-[#818898]">
                    {`Raised ${formatMoney(lastProject.amount_received ?? 0, lastProject.currency ?? 'USD')} of ${formatMoney(lastProject.amount_requested ?? 0, lastProject.currency ?? 'USD')}`}
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-slate-200/80">
                    <div className="h-2 rounded-full bg-[#6B39F4]" style={{ width: `${fundingProgress}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-[#6B39F4]">
                    {lastProject.interest_rate ? `${lastProject.interest_rate}% interest` : 'Interest pending'}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[11px] text-[#818898]">Open venture details</p>
                    <span className="rounded-full border border-[#D3C4FC] px-3 py-1 text-[11px] font-semibold text-[#6B39F4]">
                      Details
                    </span>
                  </div>
                </div>
              </button>
            ) : (
              <div className="rounded-[16px] border border-white/25 bg-white/20 backdrop-blur-md p-5 text-sm text-[#818898]">
                Your listings will appear here once they are active.
              </div>
            )}
          </>
        )}

        {rolSeleccionado === 'inversor' ? (
          <button
            type="button"
            onClick={() => router.push('/feed')}
            className="w-full rounded-[16px] border-2 border-dashed border-[#D3C4FC] py-4 text-sm font-semibold text-[#6B39F4]"
          >
            + Invest in a new venture
          </button>
        ) : null}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0F172A]">Transactions</h2>
          <button
            type="button"
            onClick={() => router.push('/portfolio')}
            className="text-sm font-semibold text-[#6B39F4]"
          >
            View all
          </button>
        </div>

        <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
          {loadingTransactions ? (
            <div className="rounded-[18px] border border-white/25 bg-white/20 backdrop-blur-md px-4 py-5 text-sm text-[#818898]">
              Loading transactions...
            </div>
          ) : null}

          {!loadingTransactions && transactions.length === 0 ? (
            <div className="rounded-[18px] border border-white/25 bg-white/20 backdrop-blur-md px-4 py-5 text-sm text-[#818898]">
              Your activity will appear here.
            </div>
          ) : null}

          {!loadingTransactions
            ? transactions.map((transaction) => {
                const incoming = isIncomingTransaction(transaction, smartWalletAddress);
                const amountColor = incoming ? 'text-[#40C4AA]' : 'text-[#E33A24]';
                const amountPrefix = incoming ? '+' : '-';

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-[18px] border border-white/25 bg-white/20 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-full border border-white/25 bg-white/20 backdrop-blur-md">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                        ) : loadingProfileSummary ? (
                          <div className="h-full w-full animate-pulse bg-white/30" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#6B39F4]">
                            {displayName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">{displayName}</p>
                        <p className="text-xs capitalize text-[#818898]">
                          {getTransactionTypeLabel(transaction, smartWalletAddress)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-sm font-semibold ${amountColor}`}>
                        {amountPrefix}
                        {formatTransactionAmount(transaction.amount)}
                      </p>
                      <p className="text-xs text-[#818898]">{formatTransactionDate(transaction.created_at)}</p>
                    </div>
                  </div>
                );
              })
            : null}
        </div>
      </div>

      </div>

      <BottomNav />

      {showTopUpOptions ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] border border-white/25 bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(238,244,255,0.86))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B39F4]">
                  Top up options
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#0F172A]">Choose a provider</h3>
                <p className="mt-2 text-sm text-[#666D80]">
                  Keep the current wallet funding flow or open a Coinbase checkout for USDC on
                  Polygon.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (openingTopUpProvider) return;
                  setShowTopUpOptions(false);
                }}
                className="rounded-full border border-white/40 bg-white/70 px-3 py-1 text-sm font-semibold text-[#0F172A]"
                aria-label="Close top up options"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={handleOpenCurrentTopUp}
                disabled={openingTopUpProvider !== null}
                className="w-full rounded-[20px] border border-white/25 bg-white/80 px-4 py-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition hover:bg-white disabled:cursor-wait disabled:opacity-70"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">Current provider</p>
                    <p className="mt-1 text-xs text-[#666D80]">
                      Opens the same wallet funding flow you already use in the app.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#4F46E5]">
                    {openingTopUpProvider === 'current' ? 'Opening...' : 'Default'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleOpenCoinbaseTopUp}
                disabled={openingTopUpProvider !== null}
                className="w-full rounded-[20px] border border-[#D6E4FF] bg-[linear-gradient(135deg,rgba(0,82,255,0.10),rgba(255,255,255,0.92))] px-4 py-4 text-left shadow-[0_10px_28px_rgba(0,82,255,0.12)] transition hover:bg-[linear-gradient(135deg,rgba(0,82,255,0.16),rgba(255,255,255,0.96))] disabled:cursor-wait disabled:opacity-70"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">Coinbase</p>
                    <p className="mt-1 text-xs text-[#666D80]">
                      Opens a hosted Coinbase checkout to buy USDC and send it to your Polygon
                      smart wallet.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#0052FF] px-3 py-1 text-xs font-semibold text-white">
                    {openingTopUpProvider === 'coinbase' ? 'Opening...' : 'New'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


