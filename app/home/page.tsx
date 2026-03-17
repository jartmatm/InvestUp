'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import BottomNav from '@/components/BottomNav';
import { useInvestUp } from '@/lib/investup-context';
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

function IconNavHome() {
  return (
    <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H7C5.34315 21 4 19.7389 4 18.1833V10.9C4 10.153 4.31607 9.43656 4.87868 8.90834L10.5858 3.54999C11.3668 2.81667 12.6332 2.81667 13.4142 3.54999L19.1213 8.90834C19.6839 9.43656 20 10.153 20 10.9V18.1833C20 19.7389 18.6569 21 17 21H15M9 21V16C9 14.8954 9.89543 14 11 14H13C14.1046 14 15 14.8954 15 16V21M9 21H15" />
    </svg>
  );
}

function IconNavActivity() {
  return (
    <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 21V13H9V21M15 21H9M15 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H17C15.89543 3 15 3.89543 15 5V21ZM9 21V10C9 8.89543 8.10457 8 7 8H5C3.89543 8 3 8.89543 3 10V19C3 20.1046 3.89543 21 5 21H9Z" />
    </svg>
  );
}

function IconNavPayments() {
  return (
    <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 1C4.79086 1 3 2.79086 3 5V19C3 21.2091 4.79086 23 7 23H17C19.2091 23 21 21.2091 21 19V9.24264C21 8.66548 20.8752 8.10113 20.6407 7.5858C20.4442 7.15387 20.1704 6.75623 19.8284 6.41421L15.5858 2.17157C15.2438 1.82956 14.8461 1.55583 14.4142 1.35928C13.8989 1.12476 13.3345 1 12.7574 1H7ZM5 5C5 3.89543 5.89543 3 7 3H12.7574C13.0459 3 13.328 3.06235 13.5858 3.17965C13.733 3.24662 13.8721 3.33149 14 3.43287V7.00007C14 7.55236 14.4477 8.00007 15 8.00007H18.5672C18.6685 8.1279 18.7534 8.26705 18.8204 8.4142C18.9377 8.67196 19 8.95406 19 9.24264V19C19 20.1046 18.1046 21 17 21H7C5.89543 21 5 20.1046 5 19V5ZM7 5C6.44772 5 6 5.44772 6 6C6 6.55228 6.44772 7 7 7H11C11.5523 7 12 6.55228 12 6C12 5.44772 11.5523 5 11 5H7ZM7 9C6.44772 9 6 9.44772 6 10C6 10.5523 6.44772 11 7 11H12C12.5523 11 13 10.5523 13 10C13 9.44772 12.5523 9 12 9H7ZM16.25 11.5C16.25 10.9477 15.8023 10.5 15.25 10.5C14.6977 10.5 14.25 10.9477 14.25 11.5V11.6852C13.2609 12.0164 12.5 12.8286 12.5 13.8864C12.5 14.6547 12.7822 15.3357 13.4101 15.7726C13.9664 16.1596 14.6517 16.25 15.25 16.25C15.7017 16.25 15.8914 16.33 15.9476 16.3692C15.9618 16.379 15.9636 16.3824 15.968 16.392C15.9756 16.4082 16 16.4708 16 16.6136C16 16.613 16 16.613 15.9999 16.6137C15.9989 16.6204 15.9884 16.6912 15.8779 16.7835C15.7637 16.8788 15.5573 16.9773 15.25 16.9773C14.8385 16.9773 14.5976 16.8018 14.5148 16.6964C14.1735 16.2622 13.5448 16.1869 13.1106 16.5282C12.6764 16.8694 12.601 17.4981 12.9423 17.9323C13.2553 18.3306 13.7096 18.6452 14.25 18.8213V19C14.25 19.5523 14.6977 20 15.25 20C15.8023 20 16.25 19.5523 16.25 19V18.8148C17.2391 18.4836 18 17.6714 18 16.6136C18 15.8453 17.7178 15.1643 17.0899 14.7274C16.5336 14.3404 15.8483 14.25 15.25 14.25C14.7983 14.25 14.6086 14.17 14.5524 14.1308C14.5382 14.121 14.5364 14.1176 14.532 14.108C14.5244 14.0918 14.5 14.0292 14.5 13.8864C14.5 13.887 14.5 13.887 14.5001 13.8863C14.5011 13.8796 14.5116 13.8088 14.6221 13.7165C14.7363 13.6212 14.9427 13.5227 15.25 13.5227C15.6615 13.5227 15.9024 13.6982 15.9852 13.8036C16.3265 14.2378 16.9552 14.3131 17.3894 13.9718C17.8236 13.6306 17.899 13.0019 17.5577 12.5677C17.2447 12.1694 16.7904 11.8548 16.25 11.6787V11.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconNavProfile() {
  return (
    <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 14H10C7.23858 14 5 16.2386 5 19V20C5 20.5523 5.44772 21 6 21H18C18.5523 21 19 20.5523 19 20V19C19 16.2386 16.7614 14 14 14Z" />
      <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" />
    </svg>
  );
}

type ActionItem = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type LastProject = {
  id: string;
  title: string;
  amount_requested: number | null;
  currency: string | null;
  photo_urls: string[] | null;
  created_at: string;
};

type TransactionRow = {
  id: string;
  created_at: string;
  movement_type: 'investment' | 'repayment' | 'transfer' | 'buy' | 'withdrawal';
  status: 'submitted' | 'confirmed' | 'failed';
  from_wallet: string | null;
  to_wallet: string | null;
  amount_usdc: number | null;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
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

const formatTransactionDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ahora';
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  });
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
    historial,
    abrirCompra,
    abrirRetiro,
  } = useInvestUp();
  const { avatarUrl, displayName: profileName, loading: loadingProfileSummary } = useUserProfileSummary();
  const [showBalance, setShowBalance] = useState(true);
  const [lastProject, setLastProject] = useState<LastProject | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

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
        .select('id,title,amount_requested,currency,photo_urls,created_at')
        .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(1);

      setLastProject((data ?? [])[0] ?? null);
      setLoadingProject(false);
    };

    loadLastProject();
  }, [rolSeleccionado, supabase, user?.id]);

  useEffect(() => {
    const loadTransactions = async () => {
      if (!user?.id) {
        setTransactions([]);
        return;
      }

      setLoadingTransactions(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('id,created_at,movement_type,status,from_wallet,to_wallet,amount_usdc')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) {
        console.error('Error cargando transacciones:', error.message);
        setTransactions([]);
        setLoadingTransactions(false);
        return;
      }

      setTransactions(((data ?? []) as TransactionRow[]).filter((item) => item.id));
      setLoadingTransactions(false);
    };

    loadTransactions();
  }, [supabase, user?.id, historial.length]);

  const displayName = useMemo(() => profileName || userAlias || 'Usuario', [profileName, userAlias]);
  const roleLabel =
    rolSeleccionado === 'emprendedor'
      ? 'Emprendedor'
      : rolSeleccionado === 'inversor'
        ? 'Inversionista'
        : 'Usuario';
  const sectionTitle = rolSeleccionado === 'emprendedor' ? 'Mis publicaciones' : 'Inversiones';
  const addLabel =
    rolSeleccionado === 'emprendedor'
      ? 'Agregar nueva publicación'
      : 'Invertir en nuevo emprendimiento';

  const actions: ActionItem[] = [
    { label: 'Recargar', icon: <IconPlus />, onClick: abrirCompra },
    { label: 'Enviar', icon: <IconSend />, onClick: () => router.push('/invest') },
    { label: 'Retirar', icon: <IconDownload />, onClick: abrirRetiro },
    { label: 'Historial', icon: <IconClock />, onClick: () => router.push('/portfolio') },
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
              <p className="text-sm text-[#818898]">Hola! {roleLabel}</p>
              <h1 className="text-xl font-semibold text-[#0F172A]">{displayName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Buscar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/20 backdrop-blur-md text-[#0F172A] shadow-sm"
            >
              <IconSearch />
            </button>
            <button
              type="button"
              aria-label="Notificaciones"
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
            <p className="text-sm text-white/70">Disponible</p>
            <h2 className="mt-1 text-3xl font-bold">
              {showBalance ? `$${balanceUSDC}` : 'XXXX.XX'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowBalance((prev) => !prev)}
            className="rounded-full bg-white/20 p-2 text-white"
            aria-label={showBalance ? 'Ocultar saldo' : 'Mostrar saldo'}
          >
            <IconEye hidden={!showBalance} />
          </button>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#EFFEFA] px-3 py-1 text-xs font-semibold text-[#40C4AA]">
          <span>Recaudado: --</span>
          <span className="text-[#40C4AA]/60">•</span>
          <span>Tasa Interés: --</span>
        </div>
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
          onClick={() => router.push('/portfolio')}
          className="text-sm font-semibold text-[#6B39F4]"
        >
          Ver todo
        </button>
      </div>

      <div className="space-y-4">
        {rolSeleccionado === 'inversor' ? (
          historial.length > 0 ? (
            historial.slice(0, 3).map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="rounded-[16px] border border-white/25 bg-white/20 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md"
              >
                <p className="text-sm text-[#818898]">Inversión</p>
                <p className="mt-1 text-base font-semibold text-[#0F172A]">{item}</p>
              </div>
            ))
          ) : (
            <div className="rounded-[16px] border border-white/25 bg-white/20 backdrop-blur-md p-5 text-sm text-[#818898]">
              Aun no tienes inversiones registradas.
            </div>
          )
        ) : (
          <>
            {loadingProject ? (
              <div className="rounded-[16px] border border-white/25 bg-white/20 backdrop-blur-md p-5 text-sm text-[#818898]">
                Cargando tu ultima publicacion...
              </div>
            ) : lastProject ? (
              <div className="overflow-hidden rounded-[16px] border border-white/25 bg-white/20 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
                {lastProject.photo_urls?.[0] ? (
                  <img
                    src={lastProject.photo_urls[0]}
                    alt={lastProject.title}
                    className="h-32 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center border border-white/25 bg-white/20 backdrop-blur-md text-xs text-[#818898]">
                    Sin imagen
                  </div>
                )}
                <div className="p-4">
                  <p className="text-sm font-semibold text-[#0F172A]">{lastProject.title}</p>
                  <p className="mt-1 text-xs text-[#818898]">
                    {lastProject.amount_requested
                      ? `${lastProject.amount_requested} ${lastProject.currency ?? 'USD'}`
                      : 'Monto pendiente'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-[16px] border border-white/25 bg-white/20 backdrop-blur-md p-5 text-sm text-[#818898]">
                Aqui veras tus publicaciones cuando esten activas.
              </div>
            )}
          </>
        )}

        <button
          type="button"
          onClick={() => router.push(rolSeleccionado === 'emprendedor' ? '/portfolio' : '/feed')}
          className="w-full rounded-[16px] border-2 border-dashed border-[#D3C4FC] py-4 text-sm font-semibold text-[#6B39F4]"
        >
          + {addLabel}
        </button>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0F172A]">Transacciones</h2>
          <button
            type="button"
            onClick={() => router.push('/portfolio')}
            className="text-sm font-semibold text-[#6B39F4]"
          >
            Ver todo
          </button>
        </div>

        <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
          {loadingTransactions ? (
            <div className="rounded-[18px] border border-white/25 bg-white/20 backdrop-blur-md px-4 py-5 text-sm text-[#818898]">
              Cargando transacciones...
            </div>
          ) : null}

          {!loadingTransactions && transactions.length === 0 ? (
            <div className="rounded-[18px] border border-white/25 bg-white/20 backdrop-blur-md px-4 py-5 text-sm text-[#818898]">
              Tus movimientos apareceran aqui.
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
                        {formatTransactionAmount(transaction.amount_usdc)}
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
    </div>
  );
}


