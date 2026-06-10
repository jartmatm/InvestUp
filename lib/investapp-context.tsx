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
import {
  getEmbeddedConnectedWallet,
  useFundWallet,
  useModalStatus,
  usePrivy,
  useWallets,
} from '@privy-io/react-auth';
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import type { PublicClient } from 'viem';
import { polygon } from 'viem/chains';
import { clearAuthenticatedUserBrowserCache } from '@/lib/browser-user-cache';
import { calculateInvestmentProjection } from '@/lib/investment-math';
import {
  buildTransactionNotificationKey,
  createNotificationEntry,
  formatNotificationAmount,
  readNotificationsEnabled,
  readStoredNotifications,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  writeNotificationsEnabled,
  writeStoredNotifications,
  type AppNotification,
  type CreateAppNotificationInput,
} from '@/lib/app-notifications';
import {
  clearPendingInvestment,
  getPendingInvestment,
  type PendingInvestment,
} from '@/lib/pending-investment';
import { HOME_REFRESH_INTERVAL_MS } from '@/lib/project-status';
import { fetchCurrentUserInternalLedger } from '@/utils/client/current-user-internal-ledger';
import { createCurrentUserInvestment } from '@/utils/client/current-user-investments';
import { fetchRecipientDirectory } from '@/utils/client/recipient-directory';
import {
  createCurrentUserTransaction,
  fetchCurrentUserTransactions,
} from '@/utils/client/current-user-transactions';
import { createCurrentUserRepayment } from '@/utils/client/current-user-repayments';
import {
  fetchCurrentUserProfile,
  patchCurrentUserProfile,
} from '@/utils/client/current-user-profile';
import { syncCurrentUserWalletBalance } from '@/utils/client/current-user-wallet-balance';
import type { CurrentUserTransaction } from '@/utils/transactions/current-user';

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

type MovementType = 'investment' | 'repayment' | 'transfer' | 'withdrawal';

type ReceiptData = {
  uuid: string;
  type: MovementType;
  amount: string;
  currency: string;
  status: string;
  txHash: string;
  createdAt: string;
  senderName: string;
  senderContact: string;
  receiverName: string;
  receiverContact: string;
};

type StoredTransaction = CurrentUserTransaction;

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

type NotificationTrackedTransaction = {
  id: string;
  created_at: string;
  movement_type: 'investment' | 'repayment' | 'transfer' | 'buy' | 'withdrawal';
  status: string;
  from_wallet: string | null;
  to_wallet: string | null;
  tx_hash: string | null;
  amount: number | null;
};

type SendUsdcResult = {
  success: boolean;
  txHash: string | null;
};

type TransactionToastState = {
  variant: 'success' | 'warning' | 'error';
  message: string;
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
  guardarRol: (rol: FrontRole, options?: { completeOnboarding?: boolean }) => Promise<void>;
  actualizarSaldos: () => Promise<void>;
  cargarWalletsObjetivo: () => Promise<void>;
  enviarUSDC: (
    destino: string,
    monto: string,
    options?: { movementType?: MovementType; projectId?: string | null; investorUserId?: string | null }
  ) => Promise<SendUsdcResult>;
  abrirCompra: () => Promise<void>;
  abrirRetiro: () => void;
  lastReceipt: ReceiptData | null;
  clearReceipt: () => void;
  transactionToast: TransactionToastState | null;
  clearTransactionToast: () => void;
  notificationsEnabled: boolean;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  setNotificationsEnabled: (enabled: boolean) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  pushNotification: (input: CreateAppNotificationInput) => void;
};

const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
type PimlicoClientLike = {
  getTokenQuotes: (args: { chain?: unknown; tokens: `0x${string}`[] }) => Promise<UsdcQuote[]>;
};

type SponsoredTransactionRequest = {
  calls: Array<{ to: `0x${string}`; value: bigint; data: `0x${string}` }>;
  paymasterContext: { token: typeof USDC_ADDRESS };
};

type SponsoredTransactionSender = (request: SponsoredTransactionRequest) => Promise<`0x${string}`>;

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
let publicClientPromise: Promise<PublicClient> | null = null;
let pimlicoClientPromise: Promise<PimlicoClientLike> | null = null;

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
      }) as PimlicoClientLike;
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

type PrivyLinkedAccountLike = {
  type?: string;
  address?: string;
  chainType?: string;
  walletClientType?: string;
};

const getManagedWalletAddressFromUser = (
  user:
    | {
        smartWallet?: { address?: string };
        linkedAccounts?: PrivyLinkedAccountLike[];
      }
    | null
    | undefined
) => {
  if (typeof user?.smartWallet?.address === 'string') {
    return user.smartWallet.address;
  }

  const linkedAccounts = user?.linkedAccounts ?? [];

  const smartWallet = linkedAccounts.find(
    (account) => account.type === 'smart_wallet' && typeof account.address === 'string'
  );
  if (smartWallet?.address) return smartWallet.address;

  return undefined;
};

const getEmbeddedWalletAddressFromUser = (
  user:
    | {
        linkedAccounts?: PrivyLinkedAccountLike[];
      }
    | null
    | undefined
) => {
  const linkedAccounts = user?.linkedAccounts ?? [];

  const embeddedWallet = linkedAccounts.find(
    (account) =>
      account.type === 'wallet' &&
      account.walletClientType === 'privy' &&
      typeof account.address === 'string' &&
      (account.chainType === 'ethereum' || !account.chainType)
  );

  return embeddedWallet?.address;
};

const normalizePendingInvestment = (
  pendingInvestment: PendingInvestment | null,
  destinationIdentifier: string
) => {
  if (!pendingInvestment) return null;
  const pendingWallet = pendingInvestment.entrepreneurWallet?.toLowerCase();
  const pendingEmail = pendingInvestment.entrepreneurEmail?.trim().toLowerCase();
  const currentDestination = destinationIdentifier.trim().toLowerCase();
  if (!pendingWallet && !pendingEmail) return null;
  if (pendingWallet === currentDestination || pendingEmail === currentDestination) {
    return pendingInvestment;
  }
  return null;
};

const normalizeRecipientIdentifier = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? '';

const looksLikeEmail = (value: string | null | undefined) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value?.trim() ?? '');

const getWalletTargetDisplayName = (target: Pick<UserWalletTarget, 'name' | 'surname' | 'email'>) => {
  const full = `${target.name ?? ''} ${target.surname ?? ''}`.trim();
  if (full) return full;
  if (target.email?.trim()) return target.email.trim();
  return 'Recipient';
};

const findWalletTargetByIdentifier = (
  targets: UserWalletTarget[],
  identifier: string
) => {
  const normalized = normalizeRecipientIdentifier(identifier);
  if (!normalized) return null;

  return (
    targets.find((target) => {
      const email = normalizeRecipientIdentifier(target.email);
      const wallet = target.wallet_address?.toLowerCase() ?? '';
      return email === normalized || wallet === normalized;
    }) ?? null
  );
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message ?? error);
  }
  return String(error);
};

const isTransactionCancelledError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('user rejected') ||
    normalized.includes('user denied') ||
    normalized.includes('rejected the request') ||
    normalized.includes('transaction cancelled') ||
    normalized.includes('transaction canceled') ||
    normalized.includes('cancelled') ||
    normalized.includes('canceled')
  );
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

const getNotificationTransactionDirection = (
  transaction: Pick<NotificationTrackedTransaction, 'movement_type' | 'from_wallet' | 'to_wallet'>,
  walletAddress?: string | null
) => {
  if (transaction.movement_type === 'buy') return 'incoming' as const;
  if (transaction.movement_type === 'withdrawal') return 'outgoing' as const;

  const currentWallet = walletAddress?.toLowerCase();
  const fromWallet = transaction.from_wallet?.toLowerCase();
  const toWallet = transaction.to_wallet?.toLowerCase();

  if (!currentWallet) return 'neutral' as const;
  if (toWallet === currentWallet && fromWallet !== currentWallet) return 'incoming' as const;
  if (fromWallet === currentWallet && toWallet !== currentWallet) return 'outgoing' as const;
  return 'neutral' as const;
};

const buildTransactionNotificationInput = (
  transaction: NotificationTrackedTransaction,
  walletAddress?: string | null
): CreateAppNotificationInput => {
  const amountLabel = formatNotificationAmount(transaction.amount);
  const direction = getNotificationTransactionDirection(transaction, walletAddress);
  const counterparty =
    direction === 'incoming' ? transaction.from_wallet : transaction.to_wallet;
  const walletLabel = counterparty ? `${counterparty.slice(0, 8)}...` : 'your wallet';
  const actionHref = transaction.tx_hash
    ? `/history?q=${encodeURIComponent(transaction.tx_hash)}`
    : '/history';

  if (transaction.movement_type === 'buy') {
    return {
      kind: 'wallet_incoming',
      title: 'Money arrived to your wallet',
      body: `${amountLabel} landed in your wallet from a top up or external deposit.`,
      createdAt: transaction.created_at,
      txHash: transaction.tx_hash,
      actionHref,
    };
  }

  if (transaction.movement_type === 'investment') {
    if (direction === 'incoming') {
      return {
        kind: 'wallet_incoming',
        title: 'New investment received',
        body: `${amountLabel} entered your wallet as an investment.`,
        createdAt: transaction.created_at,
        txHash: transaction.tx_hash,
        actionHref,
      };
    }

    return {
      kind: 'investment',
      title: 'Investment transfer completed',
      body: `${amountLabel} was sent from your wallet to fund a venture.`,
      createdAt: transaction.created_at,
      txHash: transaction.tx_hash,
      actionHref,
    };
  }

  if (transaction.movement_type === 'repayment') {
    if (direction === 'incoming') {
      return {
        kind: 'wallet_incoming',
        title: 'Repayment received',
        body: `${amountLabel} reached your wallet as a repayment.`,
        createdAt: transaction.created_at,
        txHash: transaction.tx_hash,
        actionHref,
      };
    }

    return {
      kind: 'repayment',
      title: 'Repayment sent',
      body: `${amountLabel} was sent from your wallet as a repayment.`,
      createdAt: transaction.created_at,
      txHash: transaction.tx_hash,
      actionHref,
    };
  }

  if (transaction.movement_type === 'withdrawal') {
    return {
      kind: 'withdrawal',
      title: 'Withdrawal registered',
      body: `${amountLabel} is being processed as a withdrawal from your wallet.`,
      createdAt: transaction.created_at,
      txHash: transaction.tx_hash,
      actionHref,
    };
  }

  if (direction === 'incoming') {
    return {
      kind: 'wallet_incoming',
      title: 'Money arrived to your wallet',
      body: `${amountLabel} was received from ${walletLabel}.`,
      createdAt: transaction.created_at,
      txHash: transaction.tx_hash,
      actionHref,
    };
  }

  return {
    kind: 'transfer',
    title: 'Transfer completed',
    body: `${amountLabel} was sent to ${walletLabel}.`,
    createdAt: transaction.created_at,
    txHash: transaction.tx_hash,
    actionHref,
  };
};

export function InvestAppProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, authenticated, user, ready, getAccessToken, createWallet } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { isOpen: isPrivyModalOpen } = useModalStatus();
  const { fundWallet } = useFundWallet();
  const { client } = useSmartWallets();
  const managedWalletAddress = useMemo(() => getManagedWalletAddressFromUser(user), [user]);
  const embeddedWalletAddress = useMemo(() => getEmbeddedWalletAddressFromUser(user), [user]);
  const smartWalletAddress = client?.account?.address ?? managedWalletAddress;
  const embeddedConnectedWallet = useMemo(() => getEmbeddedConnectedWallet(wallets), [wallets]);
  const hasPromptedWalletSetupRef = useRef(false);

  const [faseApp, setFaseApp] = useState<FaseApp>('loading');
  const [rolSeleccionado, setRolSeleccionado] = useState<FrontRole | null>(null);
  const [balanceUSDC, setBalanceUSDC] = useState('0.00');
  const [balancePOL, setBalancePOL] = useState('0.00');
  const [historial, setHistorial] = useState<string[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [walletTargets, setWalletTargets] = useState<UserWalletTarget[]>([]);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [transactionToast, setTransactionToast] = useState<TransactionToastState | null>(null);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const quoteCacheRef = useRef<{ expiresAt: number; quote: UsdcQuote | null }>({
    expiresAt: 0,
    quote: null,
  });
  const gasPriceCacheRef = useRef<{ expiresAt: number; maxFeePerGas: bigint | null }>({
    expiresAt: 0,
    maxFeePerGas: null,
  });
  const seenTransactionNotificationKeysRef = useRef<Set<string>>(new Set());
  const bootstrappedTransactionNotificationsRef = useRef(false);

  useEffect(() => {
    hasPromptedWalletSetupRef.current = false;
  }, [authenticated, user?.id]);

  useEffect(() => {
    if (smartWalletAddress) {
      hasPromptedWalletSetupRef.current = false;
    }
  }, [smartWalletAddress]);

  useEffect(() => {
    if (!ready || !authenticated || !user) return;
    if (smartWalletAddress) return;
    if (!walletsReady) return;
    if (isPrivyModalOpen) return;
    if (hasPromptedWalletSetupRef.current) return;
    if (embeddedConnectedWallet || embeddedWalletAddress) return;

    hasPromptedWalletSetupRef.current = true;

    void createWallet().catch((error) => {
      hasPromptedWalletSetupRef.current = false;
      console.error('Error creating embedded wallet during bootstrap:', error);
    });
  }, [
    authenticated,
    createWallet,
    embeddedConnectedWallet,
    embeddedWalletAddress,
    isPrivyModalOpen,
    ready,
    smartWalletAddress,
    user,
    walletsReady,
  ]);

  const loadTransactionsForNotifications = useCallback(async () => {
    if (!user?.id) {
      return [] as NotificationTrackedTransaction[];
    }

    const { data, error } = await fetchCurrentUserTransactions(getAccessToken, {
      limit: 40,
      wallet: smartWalletAddress ?? undefined,
    });
    if (error) {
      console.error('Error loading notification transactions:', error);
      return [] as NotificationTrackedTransaction[];
    }

    return (data ?? []).map((transaction) => ({
      id: transaction.id,
      created_at: transaction.created_at,
      movement_type: transaction.movement_type as NotificationTrackedTransaction['movement_type'],
      status: transaction.status,
      from_wallet: transaction.from_wallet,
      to_wallet: transaction.to_wallet,
      tx_hash: transaction.tx_hash,
      amount: transaction.amount,
    }));
  }, [getAccessToken, smartWalletAddress, user?.id]);

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
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const persistNotifications = useCallback(
    (nextNotifications: AppNotification[]) => {
      setNotifications(nextNotifications);
      if (user?.id) {
        writeStoredNotifications(user.id, nextNotifications);
      }
    },
    [user?.id]
  );

  const pushNotification = useCallback(
    (input: CreateAppNotificationInput) => {
      if (!user?.id || !notificationsEnabled) return;

      let createdNotification: AppNotification | null = null;

      setNotifications((currentNotifications) => {
        if (
          input.dedupeKey &&
          currentNotifications.some((notification) => notification.dedupeKey === input.dedupeKey)
        ) {
          return currentNotifications;
        }

        createdNotification = createNotificationEntry(input);
        const nextNotifications = [createdNotification, ...currentNotifications].slice(0, 80);
        writeStoredNotifications(user.id, nextNotifications);
        return nextNotifications;
      });

      if (createdNotification) {
        showBrowserNotification(createdNotification);
      }
    },
    [notificationsEnabled, user?.id]
  );

  const markNotificationAsRead = useCallback(
    (notificationId: string) => {
      setNotifications((currentNotifications) => {
        const nextNotifications = currentNotifications.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        );
        if (user?.id) {
          writeStoredNotifications(user.id, nextNotifications);
        }
        return nextNotifications;
      });
    },
    [user?.id]
  );

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((currentNotifications) => {
      const nextNotifications = currentNotifications.map((notification) => ({
        ...notification,
        read: true,
      }));
      if (user?.id) {
        writeStoredNotifications(user.id, nextNotifications);
      }
      return nextNotifications;
    });
  }, [user?.id]);

  const setNotificationsEnabled = useCallback(
    (enabled: boolean) => {
      setNotificationsEnabledState(enabled);
      if (user?.id) {
        writeNotificationsEnabled(user.id, enabled);
      }
      if (enabled) {
        void requestBrowserNotificationPermission();
      }
    },
    [user?.id]
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
        const persistedStatus = status === 'completed' ? 'confirmed' : status;
        const { data: storedTransaction, error } = await createCurrentUserTransaction(
          getAccessToken,
          {
            txHash,
            fromWallet: smartWalletAddress,
            toWallet,
            amountUsdc,
            movementType,
            status: persistedStatus,
            role: mapRoleToDB(rolSeleccionado),
            metadata,
          }
        );

        if (error || !storedTransaction) {
          throw new Error(error ?? 'The transaction could not be saved.');
        }

        const receiver = walletTargets.find(
          (target) =>
            target.wallet_address &&
            target.wallet_address.toLowerCase() === toWallet.toLowerCase()
        );
        const senderName = userAlias || user.email?.address || 'Sender';
        const resolvedReceiverName =
          receiverName || metadata?.receiver_name?.toString() || receiver?.email || 'Recipient';
        const senderContact = user.email?.address || 'No email available';
        const receiverContact =
          receiver?.email ||
          (typeof metadata?.receiver_email === 'string' ? metadata.receiver_email : '') ||
          toWallet;
        const normalizedAmount = Number(storedTransaction.amount ?? amountUsdc);

        setLastReceipt({
          uuid: String(storedTransaction.uuid ?? storedTransaction.id ?? txHash ?? ''),
          type: (storedTransaction.movement_type ?? movementType) as MovementType,
          amount: Number.isFinite(normalizedAmount) ? normalizedAmount.toFixed(2) : amountUsdc,
          currency: 'USD',
          status: getReceiptStatus(String(storedTransaction.status ?? persistedStatus)),
          txHash: String(storedTransaction.tx_hash ?? txHash),
          createdAt: String(storedTransaction.created_at ?? new Date().toISOString()),
          senderName,
          senderContact,
          receiverName: resolvedReceiverName,
          receiverContact,
        });

        return storedTransaction;
      } catch (error: unknown) {
        console.error('Error saving transaction to Supabase:', getErrorMessage(error));
        return null;
      }
    },
    [
      getAccessToken,
      rolSeleccionado,
      smartWalletAddress,
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
        const normalizedAmountValue = Number.isFinite(amountValue)
          ? Number(amountValue.toFixed(6))
          : 0;
        const { error } = await createCurrentUserInvestment(getAccessToken, {
          txHash,
          transactionId: transactionId ?? null,
          amountUsdc: String(normalizedAmountValue),
          fromWallet: smartWalletAddress,
          toWallet,
          projectId: pendingInvestment.projectId,
          projectTitle: pendingInvestment.projectTitle,
          entrepreneurUserId: pendingInvestment.entrepreneurUserId || null,
          entrepreneurName: pendingInvestment.entrepreneurName,
          currency: pendingInvestment.currency,
          interestRateEa: Number(pendingInvestment.interestRateEa ?? 0),
          termMonths: Number(pendingInvestment.termMonths ?? 0),
          projectedReturnUsdc: projection.projectedReturnUsdc,
          projectedTotalUsdc: projection.projectedTotalUsdc,
        });

        if (error) {
          throw new Error(error);
        }
        return true;
      } catch (error: unknown) {
        console.error('Error saving investment to Supabase:', getErrorMessage(error));
        return false;
      }
    },
    [getAccessToken, smartWalletAddress, user?.id]
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
        const receiver = walletTargets.find(
          (target) =>
            target.wallet_address &&
            target.wallet_address.toLowerCase() === toWallet.toLowerCase()
        );

        const { error } = await createCurrentUserRepayment(getAccessToken, {
          txHash,
          transactionId: transactionId ?? null,
          transactionUuid: transactionUuid ?? null,
          amountUsdc,
          fromWallet: smartWalletAddress,
          toWallet,
          projectId: projectId ?? null,
          investorUserId: investorUserId ?? receiver?.id ?? null,
          receiverEmail: receiver?.email ?? null,
        });

        if (error) {
          throw new Error(error);
        }

        return true;
      } catch (error: unknown) {
        console.error('Error saving repayment to Supabase:', getErrorMessage(error));
        return false;
      }
    },
    [getAccessToken, smartWalletAddress, user?.id, walletTargets]
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

      const { data: walletBalance, error: walletBalanceError } = await syncCurrentUserWalletBalance(
        getAccessToken
      );

      if (walletBalanceError || !walletBalance) {
        throw new Error(walletBalanceError ?? 'Could not sync the wallet balance.');
      }

      setBalanceUSDC(Number(walletBalance.available_wallet_usd ?? 0).toFixed(2));
    } catch (error) {
      console.error('Error refreshing balances:', error);

      try {
        const [{ formatUnits }, publicClient] = await Promise.all([import('viem'), getPublicClient()]);
        const balUsdc = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [smartWalletAddress as `0x${string}`],
        });

        setBalanceUSDC(Number(formatUnits(balUsdc as bigint, 6)).toFixed(2));
      } catch (fallbackError) {
        console.error('Error reading fallback wallet balance:', fallbackError);
      }
    }
  }, [getAccessToken, smartWalletAddress]);

  const guardarRol = useCallback(
    async (rolFrontend: FrontRole, options?: { completeOnboarding?: boolean }) => {
      if (!user) return;
      const rolParaDB = mapRoleToDB(rolFrontend);
      if (!rolParaDB) return;
      const completeOnboarding = options?.completeOnboarding ?? true;

      try {
        const { error } = await patchCurrentUserProfile(getAccessToken, {
          email: user.email?.address ?? null,
          role: rolParaDB,
          wallet_address: smartWalletAddress ?? null,
        });
        if (error) throw error;

        localStorage.setItem(getRolKey(user.id), rolFrontend);
        if (completeOnboarding) {
          localStorage.setItem(getOnboardingDoneKey(user.id), '1');
        } else {
          localStorage.removeItem(getOnboardingDoneKey(user.id));
          localStorage.removeItem(getLegacyOnboardingDoneKey(user.id));
        }
        setRolSeleccionado(rolFrontend);
        setFaseApp(completeOnboarding ? 'dashboard' : 'onboarding');
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'We could not finish updating your role.';
        console.error('Error saving role:', message);
        throw new Error(message);
      }
    },
    [
      getAccessToken,
      getLegacyOnboardingDoneKey,
      getOnboardingDoneKey,
      getRolKey,
      smartWalletAddress,
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
      const { data, error } = await fetchRecipientDirectory(getAccessToken, {
        role: roleTarget,
        limit: 100,
      });

      if (error) throw new Error(error);
      setWalletTargets((data ?? []) as UserWalletTarget[]);
    } catch (error: unknown) {
      console.error('Error loading recipient wallets:', getErrorMessage(error));
    } finally {
      setLoadingWallets(false);
    }
  }, [authenticated, getAccessToken, rolSeleccionado, user?.id]);

  const enviarUSDC = useCallback(
    async (
      destino: string,
      monto: string,
      options?: { movementType?: MovementType; projectId?: string | null; investorUserId?: string | null }
    ) => {
      if (!client || !smartWalletAddress || !destino || !monto) {
        alert('Missing data or the wallet is not ready yet.');
        return { success: false, txHash: null };
      }

      const destinationValue = destino.trim();
      let receiverTarget = findWalletTargetByIdentifier(walletTargets, destinationValue);
      if (!receiverTarget && looksLikeEmail(destinationValue)) {
        const { data, error } = await fetchRecipientDirectory(getAccessToken, {
          email: destinationValue,
          limit: 1,
        });

        if (error) throw new Error(error);
        receiverTarget = ((data ?? [])[0] as UserWalletTarget | undefined) ?? null;
      }
      const directWalletAddress =
        destinationValue.startsWith('0x') && destinationValue.length === 42 ? destinationValue : '';
      const resolvedDestinationWallet = receiverTarget?.wallet_address ?? directWalletAddress;
      const pendingInvestment =
        rolSeleccionado === 'inversor'
          ? normalizePendingInvestment(getPendingInvestment(user?.id), destinationValue)
          : null;
      const fallbackMovementType =
        rolSeleccionado === 'emprendedor' ? 'repayment' : 'transfer';
      const movementType: MovementType =
        pendingInvestment ? 'investment' : options?.movementType ?? fallbackMovementType;

      if (!resolvedDestinationWallet) {
        const isEmailDestination = destinationValue.includes('@');
        alert(
          isEmailDestination
            ? 'We could not find an InvestApp user with that email.'
            : 'Invalid recipient email or linked wallet.'
        );
        return { success: false, txHash: null };
      }

      const { data: internalLedgerData, error: internalLedgerError } =
        await fetchCurrentUserInternalLedger(getAccessToken, { limit: 1 });
      if (internalLedgerError) {
        throw new Error(internalLedgerError);
      }

      const internalBalance = internalLedgerData?.balance;
      const hasAccountingHold =
        Number(internalBalance?.locked_balance ?? 0) > 0 ||
        Number(internalBalance?.pending_balance ?? 0) > 0;

      if (hasAccountingHold) {
        throw new Error(
          'Transfers are temporarily blocked while your internal ledger has locked or pending balances.'
        );
      }

      setLoadingTx(true);
      setTransactionToast(null);
      try {
        const [{ encodeFunctionData, formatUnits, parseUnits }, publicClient] = await Promise.all([
          import('viem'),
          getPublicClient(),
        ]);
        const montoSolicitado = parseUnits(monto, USDC_DECIMALS);
        if (montoSolicitado <= BigInt(0)) throw new Error('The amount must be greater than 0.');

        const internalAvailableBalance = internalBalance
          ? Math.max(Number(internalBalance.available_balance ?? 0), 0)
          : Math.max(Number(balanceUSDC ?? 0), 0);
        const ledgerAvailable = parseUnits(internalAvailableBalance.toFixed(USDC_DECIMALS), USDC_DECIMALS);
        if (montoSolicitado > ledgerAvailable) {
          throw new Error('Insufficient available balance according to the internal ledger.');
        }

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
          throw new Error('Insufficient balance for amount plus network fees.');
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
            args: [resolvedDestinationWallet as `0x${string}`, montoSolicitado],
          }),
        });

        const sendSponsoredTransaction = client.sendTransaction as SponsoredTransactionSender;
        const txHash = await sendSponsoredTransaction({
          calls,
          paymasterContext: { token: USDC_ADDRESS },
        });
        const enviadoFmt = Number(formatUnits(montoSolicitado, USDC_DECIMALS)).toFixed(6);
        const tipo =
          movementType === 'repayment'
            ? 'Repayment'
            : movementType === 'investment'
              ? 'Investment'
              : movementType === 'withdrawal'
                ? 'Withdrawal'
                : 'Transfer';
        const provisionalReceiverName =
          (movementType === 'withdrawal' ? 'Manual withdrawal wallet' : null) ||
          pendingInvestment?.entrepreneurEmail ||
          pendingInvestment?.entrepreneurName ||
          (receiverTarget ? getWalletTargetDisplayName(receiverTarget) : '') ||
          receiverTarget?.email ||
          'Recipient';
        const provisionalReceiverContact =
          movementType === 'withdrawal'
            ? resolvedDestinationWallet
            : pendingInvestment?.entrepreneurEmail || receiverTarget?.email || destinationValue;

        // Show the receipt as soon as we have an on-chain hash, even if the Supabase write fails later.
        setLastReceipt({
          uuid: txHash,
          type: movementType,
          amount: Number(enviadoFmt).toFixed(2),
          currency: 'USD',
          status: 'completed',
          txHash,
          createdAt: new Date().toISOString(),
          senderName: userAlias || user?.email?.address || 'Sender',
          senderContact: user?.email?.address || 'No email available',
          receiverName: provisionalReceiverName,
          receiverContact: provisionalReceiverContact,
        });

        setHistorial((prev) => [
          `${tipo} ${enviadoFmt} USD -> ${provisionalReceiverContact}`,
          ...prev,
        ]);
        const transactionNotificationKey = buildTransactionNotificationKey(txHash, txHash);
        if (transactionNotificationKey) {
          seenTransactionNotificationKeysRef.current.add(transactionNotificationKey);
        }

        pushNotification({
          kind:
            movementType === 'investment'
              ? 'investment'
              : movementType === 'repayment'
                ? 'repayment'
                : movementType === 'withdrawal'
                  ? 'withdrawal'
                  : 'transfer',
          title:
            movementType === 'investment'
              ? 'Investment transfer completed'
              : movementType === 'repayment'
                ? 'Repayment sent'
                : movementType === 'withdrawal'
                  ? 'Withdrawal sent'
                  : 'Transfer completed',
          body:
            movementType === 'investment'
              ? `${formatNotificationAmount(enviadoFmt)} was sent to ${
                  pendingInvestment?.projectTitle || provisionalReceiverName
                }.`
              : movementType === 'withdrawal'
                ? `${formatNotificationAmount(enviadoFmt)} was sent to the manual withdrawal wallet.`
                : `${formatNotificationAmount(enviadoFmt)} was sent to ${provisionalReceiverName}.`,
          txHash,
          dedupeKey: transactionNotificationKey,
          actionHref: `/history?q=${encodeURIComponent(txHash)}`,
        });

        setTransactionToast({
          variant: 'success',
          message:
            movementType === 'investment'
              ? 'Investment approved and sent successfully.'
              : movementType === 'repayment'
                ? 'Repayment approved and sent successfully.'
                : movementType === 'withdrawal'
                  ? 'Withdrawal approved and sent successfully.'
                  : 'Transfer approved and sent successfully.',
        });

        const transactionRow = await registrarTransaccion({
          txHash,
          toWallet: resolvedDestinationWallet,
          amountUsdc: enviadoFmt,
          movementType,
          status: 'completed',
          receiverName: pendingInvestment?.entrepreneurEmail || pendingInvestment?.entrepreneurName,
          metadata: pendingInvestment
            ? {
                project_id: pendingInvestment.projectId,
                project_title: pendingInvestment.projectTitle,
                entrepreneur_user_id: pendingInvestment.entrepreneurUserId,
                entrepreneur_name: pendingInvestment.entrepreneurName,
                receiver_email: pendingInvestment.entrepreneurEmail ?? null,
                projected_return_usdc: pendingInvestment.projectedReturnUsdc,
                projected_total_usdc: pendingInvestment.projectedTotalUsdc,
                receiver_name:
                  pendingInvestment.entrepreneurEmail ?? pendingInvestment.entrepreneurName,
              }
            : movementType === 'repayment'
              ? {
                  investor_user_id: receiverTarget?.id ?? null,
                  receiver_name: receiverTarget?.email ?? 'Investor',
                  receiver_email: receiverTarget?.email ?? null,
                  created_from: 'direct-repayment-flow',
                }
              : movementType === 'withdrawal'
                ? {
                    receiver_name: 'Manual withdrawal wallet',
                    created_from: 'manual-withdrawal-flow',
                  }
              : {
                  receiver_user_id: receiverTarget?.id ?? null,
                  receiver_name: receiverTarget?.email ?? 'Recipient',
                  receiver_email: receiverTarget?.email ?? null,
                  created_from: 'direct-transfer-flow',
                },
        });

        if (pendingInvestment) {
          await registrarInversion({
            pendingInvestment,
            txHash,
            transactionId: transactionRow?.id ?? null,
            amountUsdc: enviadoFmt,
            toWallet: resolvedDestinationWallet,
          });
          clearPendingInvestment(user?.id);
        } else if (movementType === 'repayment') {
          await registrarRepayment({
            txHash,
            transactionId: transactionRow?.id ?? null,
            transactionUuid: transactionRow?.uuid ?? null,
            amountUsdc: enviadoFmt,
            toWallet: resolvedDestinationWallet,
            projectId: options?.projectId ?? null,
            investorUserId: options?.investorUserId ?? null,
          });
        }

        await actualizarSaldos();
        return { success: true, txHash };
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        if (isTransactionCancelledError(message)) {
          setTransactionToast({
            variant: 'warning',
            message: 'Transaction cancelled before completion.',
          });
        } else if (message.includes('AA21') || message.includes("didn't pay prefund")) {
          setTransactionToast({
            variant: 'error',
            message: 'Transaction could not be sponsored. Please review your wallet setup and try again.',
          });
        } else {
          setTransactionToast({
            variant: 'error',
            message: `Transaction failed: ${message || 'unknown error'}`,
          });
        }
        return { success: false, txHash: null };
      } finally {
        setLoadingTx(false);
      }
    },
    [
      actualizarSaldos,
      client,
      getCachedMaxFeePerGas,
      getCachedUsdcQuote,
      getAccessToken,
      balanceUSDC,
      registrarInversion,
      registrarRepayment,
      registrarTransaccion,
      rolSeleccionado,
      smartWalletAddress,
      pushNotification,
      user?.email?.address,
      userAlias,
      walletTargets,
      user?.id,
    ]
  );

  const abrirCompra = useCallback(async () => {
    if (!smartWalletAddress) {
      alert('Wait until your smart wallet is ready.');
      return;
    }
    try {
      const result = await fundWallet({
        address: smartWalletAddress,
        options: {
          chain: polygon,
          asset: 'USDC',
          uiConfig: {
            landing: {
              title: 'Top up',
            },
          },
        },
      });

      if (result?.status !== 'completed') {
        return;
      }

      pushNotification({
        kind: 'top_up',
        title: 'Top up completed',
        body: 'Your top up request finished. Your balance will update once the funds arrive.',
        actionHref: '/home',
      });
    } catch (error) {
      const message = getErrorMessage(error);
      alert(`Top up is not available right now: ${message}`);
    }
  }, [fundWallet, pushNotification, smartWalletAddress]);

  const abrirRetiro = useCallback(() => {
    if (!smartWalletAddress) {
      alert('Wait until your smart wallet is ready.');
      return;
    }
    const redirectURL = encodeURIComponent(`${window.location.origin}/home`);
    const moonpayUrl = `https://sell.moonpay.com/?apiKey=pk_test_123&baseCurrencyCode=usdc_polygon&walletAddress=${smartWalletAddress}&redirectURL=${redirectURL}`;
    window.open(moonpayUrl, 'MoonPaySell', 'width=450,height=700');
    pushNotification({
      kind: 'withdrawal',
      title: 'Withdrawal flow opened',
      body: 'Finish the withdrawal provider steps to cash out your funds.',
      actionHref: '/withdraw',
    });
  }, [pushNotification, smartWalletAddress]);

  const logoutApp = useCallback(async () => {
    clearAuthenticatedUserBrowserCache(user?.id);
    await logout();
    setFaseApp('login');
    setRolSeleccionado(null);
    setWalletTargets([]);
    setHistorial([]);
    setNotifications([]);
    setNotificationsEnabledState(true);
    seenTransactionNotificationKeysRef.current = new Set();
    bootstrappedTransactionNotificationsRef.current = false;
  }, [
    logout,
    user?.id,
  ]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setNotificationsEnabledState(true);
      seenTransactionNotificationKeysRef.current = new Set();
      bootstrappedTransactionNotificationsRef.current = false;
      return;
    }

    const storedNotifications = readStoredNotifications(user.id);
    persistNotifications(storedNotifications);
    setNotificationsEnabledState(readNotificationsEnabled(user.id));
    seenTransactionNotificationKeysRef.current = new Set(
      storedNotifications
        .map((notification) => notification.dedupeKey)
        .filter((dedupeKey): dedupeKey is string => Boolean(dedupeKey))
    );
    bootstrappedTransactionNotificationsRef.current = false;
  }, [persistNotifications, user?.id]);

  useEffect(() => {
    if (!authenticated || (!user?.id && !smartWalletAddress)) return;

    let active = true;

    const syncTransactionsToNotifications = async () => {
      const recentTransactions = await loadTransactionsForNotifications();
      if (!active) return;

      const chronologicalTransactions = [...recentTransactions].sort(
        (left, right) =>
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
      );

      if (!bootstrappedTransactionNotificationsRef.current) {
        chronologicalTransactions.forEach((transaction) => {
          const dedupeKey = buildTransactionNotificationKey(
            transaction.tx_hash,
            transaction.id
          );
          if (dedupeKey) {
            seenTransactionNotificationKeysRef.current.add(dedupeKey);
          }
        });
        bootstrappedTransactionNotificationsRef.current = true;
        return;
      }

      chronologicalTransactions.forEach((transaction) => {
        const dedupeKey = buildTransactionNotificationKey(
          transaction.tx_hash,
          transaction.id
        );
        if (!dedupeKey || seenTransactionNotificationKeysRef.current.has(dedupeKey)) {
          return;
        }

        seenTransactionNotificationKeysRef.current.add(dedupeKey);
        if (!notificationsEnabled) return;

        pushNotification({
          ...buildTransactionNotificationInput(transaction, smartWalletAddress),
          dedupeKey,
        });
      });
    };

    void syncTransactionsToNotifications();
    const interval = window.setInterval(() => {
      void syncTransactionsToNotifications();
    }, HOME_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [
    authenticated,
    loadTransactionsForNotifications,
    notificationsEnabled,
    pushNotification,
    smartWalletAddress,
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

      const { data, error } = await fetchCurrentUserProfile<{
        role?: string | null;
        wallet_address?: string | null;
      } | null>(getAccessToken);

      if (error) {
        console.error('Error loading user record:', error);
        if (rolLocalValido) {
          setRolSeleccionado(rolLocalValido);
        }
        if (onboardingDone && rolLocalValido) {
          setFaseApp('dashboard');
          return;
        }
        setFaseApp('onboarding');
        return;
      }

      const walletNeedsUpdate =
        !!smartWalletAddress &&
        (!data?.wallet_address || data.wallet_address.toLowerCase() !== smartWalletAddress.toLowerCase());
      const dbRoleFromData =
        data?.role === 'investor' || data?.role === 'entrepreneur' ? data.role : null;
      const roleNeedsBackfill = !dbRoleFromData && !!rolLocalDB;

      if (data && (walletNeedsUpdate || roleNeedsBackfill)) {
        const payload: {
          email: string | null;
          wallet_address: string | null;
          role?: 'investor' | 'entrepreneur';
        } = {
          email: user.email?.address ?? null,
          wallet_address: smartWalletAddress ?? data?.wallet_address ?? null,
        };
        if (dbRoleFromData) payload.role = dbRoleFromData;
        if (!dbRoleFromData && rolLocalDB) payload.role = rolLocalDB;
        const { error: upsertError } = await patchCurrentUserProfile(getAccessToken, payload);
        if (upsertError) console.error('Error syncing user:', upsertError);
      }

      if (data) {
        const roleFront = dbRoleFromData ? mapRoleToFrontend(dbRoleFromData) : rolLocalValido;
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

      if (rolLocalValido) {
        setRolSeleccionado(rolLocalValido);
      }
      setFaseApp('onboarding');
    };

    verificarUsuario();
  }, [
    authenticated,
    getLegacyOnboardingDoneKey,
    getLegacyRolKey,
    getAccessToken,
    getOnboardingDoneKey,
    getRolKey,
    ready,
    smartWalletAddress,
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
    abrirRetiro,
    lastReceipt,
    clearReceipt: () => setLastReceipt(null),
    transactionToast,
    clearTransactionToast: () => setTransactionToast(null),
    notificationsEnabled,
    notifications,
    unreadNotificationsCount,
    setNotificationsEnabled,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    pushNotification,
  };

  return <InvestAppContext.Provider value={value}>{children}</InvestAppContext.Provider>;
}

export function useInvestApp() {
  const ctx = useContext(InvestAppContext);
  if (!ctx) throw new Error('useInvestApp must be used inside InvestAppProvider');
  return ctx;
}
