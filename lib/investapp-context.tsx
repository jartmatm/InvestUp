'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFundWallet, usePrivy } from '@privy-io/react-auth';
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import { createClient } from '@supabase/supabase-js';
import { calculateInvestmentProjection } from '@/lib/investment-math';
import {
  clearPendingInvestment,
  getPendingInvestment,
  type PendingInvestment,
} from '@/lib/pending-investment';
import { getNextProjectStatusAfterFunding } from '@/lib/project-status';
import {
  detectInvestmentsSchema,
  detectTransactionsSchema,
  generateLegacyRowIds,
} from '@/lib/supabase-ledger-compat';
import { getAmountValue, runWithAmountColumnFallback } from '@/lib/supabase-amount';

type FrontRole = 'inversor' | 'emprendedor';
type FaseApp = 'loading' | 'login' | 'onboarding' | 'dashboard';

type UserWalletTarget = {
  id: string;
  email: string | null;
  name: string | null;
  surname: string | null;
  avatar_url: string | null;
  country: string | null;
  role: 'investor' | 'entrepreneur';
  wallet_address: string | null;
};

type UsdcQuote = {
  postOpGas?: bigint;
  exchangeRate: bigint;
  paymaster: `0x${string}`;
};

type MovementType = 'investment' | 'repayment' | 'transfer';

type ReceiptData = {
  uuid: string;
  type: MovementType;
  amount: string;
  currency: string;
  status: string;
  txHash: string;
  createdAt: string;
  senderName: string;
  senderWallet: string;
  receiverName: string;
  receiverWallet: string;
};

type StoredTransaction = {
  id: string;
  uuid?: string | null;
  created_at: string;
  movement_type?: MovementType;
  type?: MovementType;
  status: string;
  tx_hash: string | null;
  from_wallet: string | null;
  to_wallet: string | null;
  meta?: Record<string, unknown> | null;
  amount?: number | null;
  amount_usdc?: number | null;
};

type RegisterTransactionArgs = {
  txHash: string;
  toWallet: string;
  amountUsdc: string;
  movementType: MovementType;
  status?: 'submitted' | 'confirmed' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
  receiverName?: string;
};

type RegisterInvestmentArgs = {
  pendingInvestment: PendingInvestment;
  txHash: string;
  transactionId?: string | null;
  amountUsdc: string;
  toWallet: string;
};

type RegisterRepaymentArgs = {
  txHash: string;
  transactionId?: string | null;
  transactionUuid?: string | null;
  amountUsdc: string;
  toWallet: string;
  projectId?: string | null;
  investorUserId?: string | null;
};

type InvestAppContextType = {
  ready: boolean;
  authenticated: boolean;
  login: (options?: Record<string, unknown>) => void;
  logoutApp: () => Promise<void>;
  faseApp: FaseApp;
  rolSeleccionado: FrontRole | null;
  userAlias: string;
  smartWalletAddress: string | undefined;
  balanceUSDC: string;
  balancePOL: string;
  historial: string[];
  loadingTx: boolean;
  loadingWallets: boolean;
  walletTargets: UserWalletTarget[];
  transferLabel: string;
  transferenciaTitulo: string;
  guardarRol: (rol: FrontRole) => Promise<void>;
  actualizarSaldos: () => Promise<void>;
  cargarWalletsObjetivo: () => Promise<void>;
  enviarUSDC: (
    destino: string,
    monto: string,
    options?: { movementType?: MovementType; projectId?: string | null; investorUserId?: string | null }
  ) => Promise<boolean>;
  abrirCompra: () => Promise<void>;
  abrirCompraCoinbase: () => Promise<void>;
  abrirRetiro: () => void;
  lastReceipt: ReceiptData | null;
  clearReceipt: () => void;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

const USDC_DECIMALS = 6;
const MAX_UINT256 = (BigInt(1) << BigInt(256)) - BigInt(1);
const GAS_BUFFER_BPS = BigInt(10500);
const PIMLICO_API_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
const PIMLICO_CHAIN_ID = 137;
const PIMLICO_BUNDLER_URL =
  process.env.NEXT_PUBLIC_PIMLICO_BUNDLER_URL ||
  (PIMLICO_API_KEY ? `https://api.pimlico.io/v2/${PIMLICO_CHAIN_ID}/rpc?apikey=${PIMLICO_API_KEY}` : '');
const PIMLICO_QUOTE_TTL_MS = 30000;
const ESTIMATED_USER_OP_GAS = BigInt(300000);
const GAS_PRICE_TTL_MS = 30000;
let publicClientPromise: Promise<any> | null = null;
let pimlicoClientPromise: Promise<any> | null = null;

const getPublicClient = async () => {
  if (!publicClientPromise) {
    publicClientPromise = (async () => {
      const [{ createPublicClient, http }, { polygon }] = await Promise.all([
        import('viem'),
        import('viem/chains'),
      ]);

      return createPublicClient({
        chain: polygon,
        transport: http('https://polygon-mainnet.infura.io/v3/002caff678d04f258bed0609c0957c82'),
      });
    })();
  }

  return publicClientPromise;
};

const getPimlicoClient = async () => {
  if (!PIMLICO_BUNDLER_URL) return null;

  if (!pimlicoClientPromise) {
    pimlicoClientPromise = (async () => {
      const [{ createPimlicoClient }, { http }, { polygon }] = await Promise.all([
        import('permissionless/clients/pimlico'),
        import('viem'),
        import('viem/chains'),
      ]);

      return createPimlicoClient({
        chain: polygon,
        transport: http(PIMLICO_BUNDLER_URL),
      });
    })();
  }

  return pimlicoClientPromise;
};

const InvestAppContext = createContext<InvestAppContextType | null>(null);

const mapRoleToFrontend = (role: string | null | undefined): FrontRole | null => {
  if (role === 'investor') return 'inversor';
  if (role === 'entrepreneur') return 'emprendedor';
  return null;
};

const mapRoleToDB = (role: FrontRole | null | undefined): 'investor' | 'entrepreneur' | null => {
  if (role === 'inversor') return 'investor';
  if (role === 'emprendedor') return 'entrepreneur';
  return null;
};

const normalizePendingInvestment = (
  pendingInvestment: PendingInvestment | null,
  destinationWallet: string
) => {
  if (!pendingInvestment) return null;
  const pendingWallet = pendingInvestment.entrepreneurWallet?.toLowerCase();
  const currentDestination = destinationWallet.toLowerCase();
  if (!pendingWallet || pendingWallet !== currentDestination) return null;
  return pendingInvestment;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message ?? error);
  }
  return String(error);
};

const getReceiptStatus = (status: string | null | undefined) => {
  const normalized = String(status ?? '').toLowerCase();
  if (
    normalized === 'completed' ||
    normalized === 'confirmed' ||
    normalized === 'approved' ||
    normalized === 'success'
  ) {
    return 'completed';
  }
  if (normalized === 'failed' || normalized === 'rejected') return 'failed';
  if (normalized === 'pending') return 'pending';
  if (normalized === 'submitted') return 'submitted';
  return status ?? 'completed';
};

const asTextId = (value: string | number | null | undefined) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const asNumericId = (value: string | number | null | undefined) => {
  if (value == null) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const buildUniqueIdCandidates = (
  ...values: Array<string | number | null | undefined>
): Array<string | number | null> => {
  const seen = new Set<string>();
  const result: Array<string | number | null> = [];

  values.forEach((value) => {
    const key = value == null ? '__null__' : `${typeof value}:${String(value)}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(value ?? null);
  });

  return result;
};

export function InvestAppProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, authenticated, user, ready, getAccessToken } = usePrivy();
  const { fundWallet } = useFundWallet();
  const { client } = useSmartWallets();
  const smartWalletAddress = client?.account?.address;

  const [faseApp, setFaseApp] = useState<FaseApp>('loading');
  const [rolSeleccionado, setRolSeleccionado] = useState<FrontRole | null>(null);
  const [balanceUSDC, setBalanceUSDC] = useState('0.00');
  const [balancePOL, setBalancePOL] = useState('0.00');
  const [historial, setHistorial] = useState<string[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [walletTargets, setWalletTargets] = useState<UserWalletTarget[]>([]);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);

  const quoteCacheRef = useRef<{ expiresAt: number; quote: UsdcQuote | null }>({
    expiresAt: 0,
    quote: null,
  });
  const gasPriceCacheRef = useRef<{ expiresAt: number; maxFeePerGas: bigint | null }>({
    expiresAt: 0,
    maxFeePerGas: null,
  });
  const transactionSchemaRef = useRef<'unknown' | 'modern' | 'legacy'>('unknown');
  const investmentSchemaRef = useRef<'unknown' | 'modern' | 'legacy'>('unknown');

  const supabase = useMemo(() => {
    const authedFetch: typeof fetch = async (input, init = {}) => {
      const token = await getAccessToken();
      const baseHeaders = new Headers(init.headers ?? {});
      baseHeaders.set('apikey', SUPABASE_ANON_KEY);

      const run = (headers: Headers) => fetch(input, { ...init, headers });

      if (!token) {
        return run(baseHeaders);
      }

      const headersWithAuth = new Headers(baseHeaders);
      headersWithAuth.set('Authorization', `Bearer ${token}`);
      const response = await run(headersWithAuth);

      if (response.ok) return response;

      const raw = await response.clone().text();
      const lower = raw.toLowerCase();
      const shouldFallback =
        response.status === 401 ||
        response.status === 403 ||
        lower.includes('no suitable key') ||
        lower.includes('wrong key type') ||
        lower.includes('invalid jwt');

      if (!shouldFallback) return response;

      return run(baseHeaders);
    };

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: authedFetch },
    });
  }, [getAccessToken]);

  const getTransactionSchema = useCallback(async () => {
    if (transactionSchemaRef.current !== 'unknown') {
      return transactionSchemaRef.current;
    }

    const schema = await detectTransactionsSchema(supabase);
    transactionSchemaRef.current = schema;
    return schema;
  }, [supabase]);

  const getInvestmentSchema = useCallback(async () => {
    if (investmentSchemaRef.current !== 'unknown') {
      return investmentSchemaRef.current;
    }

    const schema = await detectInvestmentsSchema(supabase);
    investmentSchemaRef.current = schema;
    return schema;
  }, [supabase]);

  const userAlias = user?.email?.address?.split('@')[0] ?? 'user';
  const transferLabel = rolSeleccionado === 'emprendedor' ? 'Repayment' : 'Transfer';
  const transferenciaTitulo =
    rolSeleccionado === 'emprendedor' ? 'Confirm repayment' : 'Confirm transfer';
  const getRolKey = useCallback((id: string) => `investapp_rol_${id}`, []);
  const getLegacyRolKey = useCallback((id: string) => `investup_rol_${id}`, []);
  const getOnboardingDoneKey = useCallback((id: string) => `investapp_onboarding_done_${id}`, []);
  const getLegacyOnboardingDoneKey = useCallback(
    (id: string) => `investup_onboarding_done_${id}`,
    []
  );

  const registrarTransaccion = useCallback(
    async ({
      txHash,
      toWallet,
      amountUsdc,
      movementType,
      status = 'submitted',
      metadata,
      receiverName,
    }: RegisterTransactionArgs): Promise<StoredTransaction | null> => {
      if (!user?.id || !smartWalletAddress) return null;

      try {
        const amountValue = Number(amountUsdc);
        let storedTransaction: StoredTransaction | null = null;
        const normalizedAmountValue = Number.isFinite(amountValue) ? Number(amountValue.toFixed(6)) : null;
        const transactionSchema = await getTransactionSchema();
        const persistedStatus =
          transactionSchema === 'legacy' ? status : status === 'completed' ? 'confirmed' : status;
        const insertResult =
          transactionSchema === 'legacy'
            ? await runWithAmountColumnFallback((amountColumn) => {
                const legacyIds = generateLegacyRowIds();
                return supabase
                  .from('transactions')
                  .insert({
                    id: legacyIds.id,
                    uuid: legacyIds.uuid,
                    user_id: user.id,
                    type: movementType,
                    status: persistedStatus,
                    currency: 'USDC',
                    tx_hash: txHash,
                    meta: {
                      app: 'investapp-web',
                      role: mapRoleToDB(rolSeleccionado),
                      chain: 'polygon',
                      from_wallet: smartWalletAddress,
                      to_wallet: toWallet,
                      ...metadata,
                    },
                    [amountColumn]: normalizedAmountValue,
                  })
                  .select(`id,uuid,created_at,type,status,tx_hash,meta,${amountColumn},amount_usdc`)
                  .maybeSingle();
              })
            : await runWithAmountColumnFallback((amountColumn) =>
                supabase
                  .from('transactions')
                  .insert({
                    user_id: user.id,
                    role: mapRoleToDB(rolSeleccionado),
                    movement_type: movementType,
                    status: persistedStatus,
                    chain: 'polygon',
                    tx_hash: txHash,
                    from_wallet: smartWalletAddress,
                    to_wallet: toWallet,
                    metadata: {
                      app: 'investapp-web',
                      currency: 'USDC',
                      ...metadata,
                    },
                    [amountColumn]: normalizedAmountValue,
                  })
                  .select(`id,created_at,movement_type,status,tx_hash,from_wallet,to_wallet,${amountColumn},amount_usdc`)
                  .maybeSingle()
              );
        const { data, error } = insertResult;

        if (error) {
          const duplicate = error.message?.toLowerCase().includes('duplicate');
          if (!duplicate) throw error;

          const existingResult =
            transactionSchema === 'legacy'
              ? await runWithAmountColumnFallback((amountColumn) =>
                  supabase
                    .from('transactions')
                    .select(`id,uuid,created_at,type,status,tx_hash,meta,${amountColumn},amount_usdc`)
                    .eq('tx_hash', txHash)
                    .maybeSingle()
                )
              : await runWithAmountColumnFallback((amountColumn) =>
                  supabase
                    .from('transactions')
                    .select(`id,created_at,movement_type,status,tx_hash,from_wallet,to_wallet,${amountColumn},amount_usdc`)
                    .eq('tx_hash', txHash)
                    .maybeSingle()
                );
          const { data: existingData, error: existingError } = existingResult;

          if (existingError) throw existingError;
          storedTransaction = (existingData ?? null) as StoredTransaction | null;
        } else {
          storedTransaction = (data ?? null) as StoredTransaction | null;
        }

        const receiver = walletTargets.find(
          (target) =>
            target.wallet_address &&
            target.wallet_address.toLowerCase() === toWallet.toLowerCase()
        );
        const senderName = userAlias || user.email?.address || 'Sender';
        const resolvedReceiverName =
          receiverName || metadata?.receiver_name?.toString() || receiver?.email || 'Recipient';
        const normalizedAmount = Number(getAmountValue(storedTransaction as Record<string, unknown>) ?? amountUsdc);
        const metaObject =
          storedTransaction?.meta && typeof storedTransaction.meta === 'object'
            ? storedTransaction.meta
            : null;

        setLastReceipt({
          uuid: String(storedTransaction?.uuid ?? storedTransaction?.id ?? txHash ?? ''),
          type: (storedTransaction?.movement_type ?? storedTransaction?.type ?? movementType) as MovementType,
          amount: Number.isFinite(normalizedAmount) ? normalizedAmount.toFixed(2) : amountUsdc,
          currency: 'USDC',
          status: getReceiptStatus(String(storedTransaction?.status ?? persistedStatus)),
          txHash: String(storedTransaction?.tx_hash ?? txHash),
          createdAt: String(storedTransaction?.created_at ?? new Date().toISOString()),
          senderName,
          senderWallet:
            (typeof metaObject?.from_wallet === 'string' ? metaObject.from_wallet : null) ??
            storedTransaction?.from_wallet ??
            smartWalletAddress,
          receiverName: resolvedReceiverName,
          receiverWallet:
            (typeof metaObject?.to_wallet === 'string' ? metaObject.to_wallet : null) ??
            storedTransaction?.to_wallet ??
            toWallet,
        });

        return storedTransaction;
      } catch (error: any) {
        console.error('Error saving transaction to Supabase:', error?.message ?? error);
        return null;
      }
    },
    [
      getTransactionSchema,
      rolSeleccionado,
      smartWalletAddress,
      supabase,
      user?.email,
      user?.id,
      userAlias,
      walletTargets,
    ]
  );

  const registrarInversion = useCallback(
    async ({
      pendingInvestment,
      txHash,
      transactionId,
      amountUsdc,
      toWallet,
    }: RegisterInvestmentArgs) => {
      if (!user?.id || !smartWalletAddress) return;

      try {
        const amountValue = Number(amountUsdc);
        const projection = calculateInvestmentProjection({
          amountUsdc: amountValue,
          interestRateEa: Number(pendingInvestment.interestRateEa ?? 0),
          termMonths: Number(pendingInvestment.termMonths ?? 0),
        });
        const normalizedAmountValue = Number.isFinite(amountValue) ? Number(amountValue.toFixed(6)) : 0;
        const investmentSchema = await getInvestmentSchema();
        const { error } =
          investmentSchema === 'legacy'
            ? await runWithAmountColumnFallback((amountColumn) => {
                const legacyProjectId = Number(pendingInvestment.projectId);
                if (!Number.isFinite(legacyProjectId)) {
                  throw new Error(
                    `Legacy investments table expects a numeric project_id, but received "${pendingInvestment.projectId}".`
                  );
                }
                const legacyTransactionId =
                  transactionId && Number.isFinite(Number(transactionId))
                    ? Number(transactionId)
                    : null;
                const legacyIds = generateLegacyRowIds();
                return supabase
                  .from('investments')
                  .insert({
                    id: legacyIds.id,
                    uuid: legacyIds.uuid,
                    investor_id: user.id,
                    project_id: legacyProjectId,
                    transaction_id: legacyTransactionId,
                    status: 'confirmed',
                    [amountColumn]: normalizedAmountValue,
                  })
                  .select('id')
                  .maybeSingle();
              })
            : await runWithAmountColumnFallback((amountColumn) =>
                supabase
                  .from('investments')
                  .insert({
                    transaction_id: transactionId ?? null,
                    investor_user_id: user.id,
                    entrepreneur_user_id: pendingInvestment.entrepreneurUserId || null,
                    project_id: pendingInvestment.projectId,
                    project_title: pendingInvestment.projectTitle,
                    tx_hash: txHash,
                    from_wallet: smartWalletAddress,
                    to_wallet: toWallet,
                    interest_rate_ea: Number(pendingInvestment.interestRateEa ?? 0),
                    term_months: Number(pendingInvestment.termMonths ?? 0),
                    projected_return_usdc: projection.projectedReturnUsdc,
                    projected_total_usdc: projection.projectedTotalUsdc,
                    status: 'confirmed',
                    metadata: {
                      app: 'investapp-web',
                      currency: pendingInvestment.currency,
                      entrepreneur_name: pendingInvestment.entrepreneurName,
                      created_from: 'project-investment-flow',
                    },
                    [amountColumn]: normalizedAmountValue,
                  })
                  .select('id')
                  .maybeSingle()
              );
        if (error && !error.message?.toLowerCase().includes('duplicate')) {
          throw error;
        }
        return !error;
      } catch (error: any) {
        console.error('Error saving investment to Supabase:', error?.message ?? error);
        return false;
      }
    },
    [getInvestmentSchema, smartWalletAddress, supabase, user?.id]
  );

  const registrarRepayment = useCallback(
    async ({
      txHash,
      transactionId,
      transactionUuid,
      amountUsdc,
      toWallet,
      projectId,
      investorUserId,
    }: RegisterRepaymentArgs) => {
      if (!user?.id || !smartWalletAddress) return false;

      try {
        const amountValue = Number(amountUsdc);
        const receiver = walletTargets.find(
          (target) =>
            target.wallet_address &&
            target.wallet_address.toLowerCase() === toWallet.toLowerCase()
        );

        const normalizedAmountValue = Number.isFinite(amountValue) ? Number(amountValue.toFixed(6)) : 0;
        const transactionIdCandidates = buildUniqueIdCandidates(
          asTextId(transactionUuid),
          asTextId(transactionId),
          null
        );
        const projectIdCandidates = buildUniqueIdCandidates(
          asTextId(projectId),
          asNumericId(projectId),
          null
        );

        let saved = false;
        let lastError: unknown = null;

        for (const projectCandidate of projectIdCandidates) {
          for (const transactionCandidate of transactionIdCandidates) {
            const { error } = await runWithAmountColumnFallback((amountColumn) => {
              const payload: Record<string, unknown> = {
                entrepreneur_user_id: user.id,
                investor_user_id: investorUserId ?? receiver?.id ?? null,
                tx_hash: txHash,
                from_wallet: smartWalletAddress,
                to_wallet: toWallet,
                [amountColumn]: normalizedAmountValue,
                status: 'confirmed',
                metadata: {
                  app: 'investapp-web',
                  currency: 'USDC',
                  receiver_email: receiver?.email ?? null,
                  created_from: 'direct-repayment-flow',
                },
              };

              if (projectCandidate !== null) {
                payload.project_id = projectCandidate;
              }
              if (transactionCandidate !== null) {
                payload.transaction_id = transactionCandidate;
              }

              return supabase.from('repayments').insert(payload).select('id').maybeSingle();
            });

            if (!error || error.message?.toLowerCase().includes('duplicate')) {
              saved = true;
              lastError = null;
              break;
            }

            lastError = error;
          }

          if (saved) break;
        }

        if (!saved && lastError) {
          throw lastError;
        }

        return saved;
      } catch (error: any) {
        console.error('Error saving repayment to Supabase:', error?.message ?? error);
        return false;
      }
    },
    [smartWalletAddress, supabase, user?.id, walletTargets]
  );

  const actualizarMontoRecaudadoProyecto = useCallback(
    async (projectId: string, amountUsdc: number) => {
      if (!projectId || !Number.isFinite(amountUsdc) || amountUsdc <= 0) return;

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('amount_received,status')
          .eq('id', projectId)
          .maybeSingle();

        if (error) throw error;

        const currentRaised = Number((data as { amount_received?: number | null } | null)?.amount_received ?? 0);
        const nextRaised = Number((currentRaised + amountUsdc).toFixed(2));
        const nextStatus = getNextProjectStatusAfterFunding(
          (data as { status?: string | null } | null)?.status,
          nextRaised
        );
        const { error: updateError } = await supabase
          .from('projects')
          .update({ amount_received: nextRaised, status: nextStatus })
          .eq('id', projectId);

        if (updateError) throw updateError;
      } catch (error: any) {
        console.error('Error updating project raised amount:', error?.message ?? error);
      }
    },
    [supabase]
  );

  const getCachedUsdcQuote = useCallback(async () => {
    const pimlicoClient = await getPimlicoClient();
    if (!pimlicoClient) {
      throw new Error(
        'Missing Pimlico configuration (NEXT_PUBLIC_PIMLICO_API_KEY or NEXT_PUBLIC_PIMLICO_BUNDLER_URL).'
      );
    }

    const now = Date.now();
    if (quoteCacheRef.current.quote && now < quoteCacheRef.current.expiresAt) {
      return quoteCacheRef.current.quote;
    }

    const quotes = await pimlicoClient.getTokenQuotes({ tokens: [USDC_ADDRESS] });
    if (!quotes?.length) throw new Error('Pimlico did not return a quote for USDC.');

    const quote = quotes[0];
    quoteCacheRef.current = { quote, expiresAt: now + PIMLICO_QUOTE_TTL_MS };
    return quote;
  }, []);

  const getCachedMaxFeePerGas = useCallback(async () => {
    const publicClient = await getPublicClient();
    const now = Date.now();
    if (gasPriceCacheRef.current.maxFeePerGas && now < gasPriceCacheRef.current.expiresAt) {
      return gasPriceCacheRef.current.maxFeePerGas;
    }

    const fees = await publicClient.estimateFeesPerGas();
    const maxFeePerGas = BigInt(fees.maxFeePerGas ?? fees.gasPrice ?? BigInt(0));
    if (maxFeePerGas <= BigInt(0)) throw new Error('Could not estimate maxFeePerGas.');

    gasPriceCacheRef.current = { maxFeePerGas, expiresAt: now + GAS_PRICE_TTL_MS };
    return maxFeePerGas;
  }, []);

  const actualizarSaldos = useCallback(async () => {
    if (!smartWalletAddress) return;
    try {
      const [{ formatUnits }, publicClient] = await Promise.all([import('viem'), getPublicClient()]);
      const balPol = await publicClient.getBalance({ address: smartWalletAddress as `0x${string}` });
      setBalancePOL(Number(formatUnits(balPol, 18)).toFixed(4));

      const balUsdc = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [smartWalletAddress as `0x${string}`],
      });

      setBalanceUSDC(Number(formatUnits(balUsdc as bigint, 6)).toFixed(2));
    } catch (error) {
      console.error('Error refreshing balances:', error);
    }
  }, [smartWalletAddress]);

  const guardarRol = useCallback(
    async (rolFrontend: FrontRole) => {
      if (!user) return;
      const rolParaDB = mapRoleToDB(rolFrontend);
      if (!rolParaDB) return;

      try {
        const { error } = await supabase.from('users').upsert(
          {
            id: user.id,
            email: user.email?.address ?? null,
            role: rolParaDB,
            wallet_address: smartWalletAddress ?? null,
          },
          { onConflict: 'id' }
        );
        if (error) throw error;

        localStorage.setItem(getRolKey(user.id), rolFrontend);
        localStorage.setItem(getOnboardingDoneKey(user.id), '1');
        setRolSeleccionado(rolFrontend);
        setFaseApp('dashboard');
      } catch (error: any) {
        console.error('Error saving role:', error?.message ?? error);
        localStorage.setItem(getRolKey(user.id), rolFrontend);
        localStorage.setItem(getOnboardingDoneKey(user.id), '1');
        setRolSeleccionado(rolFrontend);
        setFaseApp('dashboard');
      }
    },
    [
      getOnboardingDoneKey,
      getRolKey,
      smartWalletAddress,
      supabase,
      user,
    ]
  );

  const cargarWalletsObjetivo = useCallback(async () => {
    if (!authenticated || !rolSeleccionado || !user?.id) {
      setWalletTargets([]);
      return;
    }

    const roleTarget = rolSeleccionado === 'inversor' ? 'entrepreneur' : 'investor';
    setLoadingWallets(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id,email,name,surname,avatar_url,country,role,wallet_address')
        .eq('role', roleTarget)
        .not('wallet_address', 'is', null)
        .neq('id', user.id)
        .order('email', { ascending: true });

      if (error) throw error;
      setWalletTargets((data ?? []) as UserWalletTarget[]);
    } catch (error: any) {
      console.error('Error loading recipient wallets:', error?.message ?? error);
    } finally {
      setLoadingWallets(false);
    }
  }, [authenticated, rolSeleccionado, supabase, user?.id]);

  const enviarUSDC = useCallback(
    async (
      destino: string,
      monto: string,
      options?: { movementType?: MovementType; projectId?: string | null; investorUserId?: string | null }
    ) => {
      if (!client || !smartWalletAddress || !destino || !monto) {
        alert('Missing data or the wallet is not ready yet.');
        return false;
      }
      if (!destino.startsWith('0x') || destino.length !== 42) {
        alert('Invalid destination wallet address.');
        return false;
      }

      setLoadingTx(true);
      try {
        const [{ encodeFunctionData, formatUnits, parseUnits }, publicClient] = await Promise.all([
          import('viem'),
          getPublicClient(),
        ]);
        const montoSolicitado = parseUnits(monto, USDC_DECIMALS);
        if (montoSolicitado <= BigInt(0)) throw new Error('The amount must be greater than 0.');

        const quote = await getCachedUsdcQuote();
        const maxFeePerGas = await getCachedMaxFeePerGas();
        const estimatedGasUnits = ESTIMATED_USER_OP_GAS + BigInt(quote.postOpGas ?? BigInt(0));
        let gasCostUsdc =
          (estimatedGasUnits * maxFeePerGas * BigInt(quote.exchangeRate)) / (BigInt(10) ** BigInt(18));
        gasCostUsdc = (gasCostUsdc * GAS_BUFFER_BPS) / BigInt(10000);

        const balanceDisponible = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [smartWalletAddress as `0x${string}`],
        });
        const costoTotalEstimado = montoSolicitado + gasCostUsdc;
        if ((balanceDisponible as bigint) < costoTotalEstimado) {
          throw new Error('Insufficient balance for amount plus USDC gas.');
        }

        const allowance = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'allowance',
          args: [smartWalletAddress as `0x${string}`, quote.paymaster as `0x${string}`],
        });

        const calls: Array<{ to: `0x${string}`; value: bigint; data: `0x${string}` }> = [];
        if ((allowance as bigint) < gasCostUsdc) {
          calls.push({
            to: USDC_ADDRESS,
            value: BigInt(0),
            data: encodeFunctionData({
              abi: USDC_ABI,
              functionName: 'approve',
              args: [quote.paymaster as `0x${string}`, MAX_UINT256],
            }),
          });
        }

        calls.push({
          to: USDC_ADDRESS,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: USDC_ABI,
            functionName: 'transfer',
            args: [destino as `0x${string}`, montoSolicitado],
          }),
        });

        const txHash = await client.sendTransaction({
          calls,
          paymasterContext: { token: USDC_ADDRESS },
        } as any);

        const pendingInvestment =
          rolSeleccionado === 'inversor'
            ? normalizePendingInvestment(getPendingInvestment(), destino)
            : null;
        const receiverTarget = walletTargets.find(
          (target) =>
            target.wallet_address &&
            target.wallet_address.toLowerCase() === destino.toLowerCase()
        );
        const enviadoFmt = Number(formatUnits(montoSolicitado, USDC_DECIMALS)).toFixed(6);
        const fallbackMovementType =
          rolSeleccionado === 'emprendedor' ? 'repayment' : 'transfer';
        const movementType: MovementType =
          pendingInvestment
            ? 'investment'
            : options?.movementType ?? fallbackMovementType;
        const tipo = movementType === 'repayment' ? 'Repayment' : movementType === 'investment' ? 'Investment' : 'Transfer';
        const provisionalReceiverName =
          pendingInvestment?.entrepreneurName ||
          `${receiverTarget?.name ?? ''} ${receiverTarget?.surname ?? ''}`.trim() ||
          receiverTarget?.email ||
          'Recipient';

        // Show the receipt as soon as we have an on-chain hash, even if the Supabase write fails later.
        setLastReceipt({
          uuid: txHash,
          type: movementType,
          amount: Number(enviadoFmt).toFixed(2),
          currency: 'USDC',
          status: 'completed',
          txHash,
          createdAt: new Date().toISOString(),
          senderName: userAlias || user?.email?.address || 'Sender',
          senderWallet: smartWalletAddress,
          receiverName: provisionalReceiverName,
          receiverWallet: destino,
        });

        setHistorial((prev) => [`${tipo} ${enviadoFmt} USDC -> ${destino.slice(0, 8)}...`, ...prev]);

        const transactionRow = await registrarTransaccion({
          txHash,
          toWallet: destino,
          amountUsdc: enviadoFmt,
          movementType,
          status: 'completed',
          receiverName: pendingInvestment?.entrepreneurName,
          metadata: pendingInvestment
            ? {
                project_id: pendingInvestment.projectId,
                project_title: pendingInvestment.projectTitle,
                entrepreneur_user_id: pendingInvestment.entrepreneurUserId,
                entrepreneur_name: pendingInvestment.entrepreneurName,
                projected_return_usdc: pendingInvestment.projectedReturnUsdc,
                projected_total_usdc: pendingInvestment.projectedTotalUsdc,
                receiver_name: pendingInvestment.entrepreneurName,
              }
            : movementType === 'repayment'
              ? {
                  investor_user_id: receiverTarget?.id ?? null,
                  receiver_name: receiverTarget?.email ?? 'Investor',
                  created_from: 'direct-repayment-flow',
                }
              : {
                  receiver_user_id: receiverTarget?.id ?? null,
                  receiver_name: receiverTarget?.email ?? 'Recipient',
                  created_from: 'direct-transfer-flow',
                },
        });

        if (pendingInvestment) {
          const investmentSaved = await registrarInversion({
            pendingInvestment,
            txHash,
            transactionId: transactionRow?.id ?? null,
            amountUsdc: enviadoFmt,
            toWallet: destino,
          });
          if (investmentSaved) {
            await actualizarMontoRecaudadoProyecto(
              pendingInvestment.projectId,
              Number(enviadoFmt)
            );
          }
          clearPendingInvestment();
        } else if (movementType === 'repayment') {
          await registrarRepayment({
            txHash,
            transactionId: transactionRow?.id ?? null,
            transactionUuid: transactionRow?.uuid ?? null,
            amountUsdc: enviadoFmt,
            toWallet: destino,
            projectId: options?.projectId ?? null,
            investorUserId: options?.investorUserId ?? null,
          });
        }

        await actualizarSaldos();
        return true;
      } catch (error: any) {
        const message = String(error?.message || error || '');
        if (message.includes('AA21') || message.includes("didn't pay prefund")) {
          alert('AA21 paymaster or bundler error. Please review your Pimlico configuration.');
        } else {
          alert(`The transaction failed: ${message || 'unknown error'}`);
        }
        return false;
      } finally {
        setLoadingTx(false);
      }
    },
    [
      actualizarSaldos,
      actualizarMontoRecaudadoProyecto,
      client,
      getCachedMaxFeePerGas,
      getCachedUsdcQuote,
      registrarInversion,
      registrarRepayment,
      registrarTransaccion,
      rolSeleccionado,
      smartWalletAddress,
      user?.email?.address,
      userAlias,
      walletTargets,
    ]
  );

  const abrirCompra = useCallback(async () => {
    if (!smartWalletAddress) {
      alert('Wait until your smart wallet is ready.');
      return;
    }
    await fundWallet({ address: smartWalletAddress as any });
  }, [fundWallet, smartWalletAddress]);

  const abrirCompraCoinbase = useCallback(async () => {
    if (!smartWalletAddress) {
      alert('Wait until your smart wallet is ready.');
      return;
    }

    try {
      const homeUrl = `${window.location.origin}/home`;
      const response = await fetch('/api/coinbase/onramp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: smartWalletAddress,
          partnerUserRef: user?.id ? `investapp-${user.id}` : undefined,
          redirectUrl: homeUrl,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { url?: string | null; error?: string; details?: unknown }
        | null;

      if (!response.ok || !payload?.url) {
        const detail =
          typeof payload?.details === 'string'
            ? payload.details
            : payload?.error || 'Could not create the Coinbase onramp session.';
        throw new Error(detail);
      }

      const popup = window.open(payload.url, 'CoinbaseOnramp', 'width=480,height=760');
      if (!popup) {
        window.location.assign(payload.url);
      }
    } catch (error) {
      const message = getErrorMessage(error);
      alert(`Coinbase top up is not available right now: ${message}`);
    }
  }, [smartWalletAddress, user?.id]);

  const abrirRetiro = useCallback(() => {
    if (!smartWalletAddress) {
      alert('Wait until your smart wallet is ready.');
      return;
    }
    const redirectURL = encodeURIComponent(`${window.location.origin}/home`);
    const moonpayUrl = `https://sell.moonpay.com/?apiKey=pk_test_123&baseCurrencyCode=usdc_polygon&walletAddress=${smartWalletAddress}&redirectURL=${redirectURL}`;
    window.open(moonpayUrl, 'MoonPaySell', 'width=450,height=700');
  }, [smartWalletAddress]);

  const logoutApp = useCallback(async () => {
    if (user?.id) {
      localStorage.removeItem(getRolKey(user.id));
      localStorage.removeItem(getLegacyRolKey(user.id));
      localStorage.removeItem(getOnboardingDoneKey(user.id));
      localStorage.removeItem(getLegacyOnboardingDoneKey(user.id));
    }
    clearPendingInvestment();
    await logout();
    setFaseApp('login');
    setRolSeleccionado(null);
    setWalletTargets([]);
    setHistorial([]);
  }, [
    getLegacyOnboardingDoneKey,
    getLegacyRolKey,
    getOnboardingDoneKey,
    getRolKey,
    logout,
    user?.id,
  ]);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !user) {
      setFaseApp('login');
      return;
    }

    const verificarUsuario = async () => {
      const rolLocal =
        localStorage.getItem(getRolKey(user.id)) ?? localStorage.getItem(getLegacyRolKey(user.id));
      const rolLocalValido =
        rolLocal === 'inversor' || rolLocal === 'emprendedor' ? (rolLocal as FrontRole) : null;
      const rolLocalDB = mapRoleToDB(rolLocalValido);
      const onboardingDone =
        (localStorage.getItem(getOnboardingDoneKey(user.id)) ??
          localStorage.getItem(getLegacyOnboardingDoneKey(user.id))) === '1';

      const { data, error } = await supabase
        .from('users')
        .select('role,wallet_address')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading user record:', error.message);
        if (onboardingDone && rolLocalValido) {
          setRolSeleccionado(rolLocalValido);
          setFaseApp('dashboard');
          return;
        }
        setFaseApp('onboarding');
        return;
      }

      const walletNeedsUpdate =
        !!smartWalletAddress &&
        (!data?.wallet_address || data.wallet_address.toLowerCase() !== smartWalletAddress.toLowerCase());
      const roleNeedsBackfill = !data?.role && !!rolLocalDB;
      const userNeedsInsert = !data;

      if (userNeedsInsert || walletNeedsUpdate || roleNeedsBackfill) {
        const payload: any = {
          id: user.id,
          email: user.email?.address ?? null,
          wallet_address: smartWalletAddress ?? data?.wallet_address ?? null,
        };
        if (data?.role) payload.role = data.role;
        if (!data?.role && rolLocalDB) payload.role = rolLocalDB;
        const { error: upsertError } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
        if (upsertError) console.error('Error syncing user:', upsertError.message);
      }

      if (data?.role) {
        const roleFront = mapRoleToFrontend(data.role);
        if (roleFront) {
          localStorage.setItem(getRolKey(user.id), roleFront);
          localStorage.setItem(getOnboardingDoneKey(user.id), '1');
          setRolSeleccionado(roleFront);
          setFaseApp('dashboard');
          return;
        }
      }

      if (onboardingDone && rolLocalValido) {
        setRolSeleccionado(rolLocalValido);
        setFaseApp('dashboard');
        return;
      }

      setFaseApp('onboarding');
    };

    verificarUsuario();
  }, [
    authenticated,
    getLegacyOnboardingDoneKey,
    getLegacyRolKey,
    getOnboardingDoneKey,
    getRolKey,
    ready,
    smartWalletAddress,
    supabase,
    user,
  ]);

  useEffect(() => {
    if (authenticated && smartWalletAddress) {
      actualizarSaldos();
    }
  }, [authenticated, smartWalletAddress, actualizarSaldos]);

  useEffect(() => {
    if (faseApp === 'dashboard') {
      cargarWalletsObjetivo();
    }
  }, [cargarWalletsObjetivo, faseApp]);

  const value: InvestAppContextType = {
    ready,
    authenticated,
    login,
    logoutApp,
    faseApp,
    rolSeleccionado,
    userAlias,
    smartWalletAddress,
    balanceUSDC,
    balancePOL,
    historial,
    loadingTx,
    loadingWallets,
    walletTargets,
    transferLabel,
    transferenciaTitulo,
    guardarRol,
    actualizarSaldos,
    cargarWalletsObjetivo,
    enviarUSDC,
    abrirCompra,
    abrirCompraCoinbase,
    abrirRetiro,
    lastReceipt,
    clearReceipt: () => setLastReceipt(null),
  };

  return <InvestAppContext.Provider value={value}>{children}</InvestAppContext.Provider>;
}

export function useInvestApp() {
  const ctx = useContext(InvestAppContext);
  if (!ctx) throw new Error('useInvestApp must be used inside InvestAppProvider');
  return ctx;
}
