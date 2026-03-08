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
import { createPublicClient, encodeFunctionData, formatUnits, http, parseUnits } from 'viem';
import { polygon } from 'viem/chains';
import { createPimlicoClient } from 'permissionless/clients/pimlico';

type FrontRole = 'inversor' | 'emprendedor';
type FaseApp = 'loading' | 'login' | 'onboarding' | 'dashboard';

type UserWalletTarget = {
  id: string;
  email: string | null;
  role: 'investor' | 'entrepreneur';
  wallet_address: string | null;
};

type MovementType = 'investment' | 'repayment' | 'transfer';

type InvestUpContextType = {
  ready: boolean;
  authenticated: boolean;
  login: (options?: any) => void;
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
  enviarUSDC: (destino: string, monto: string) => Promise<void>;
  abrirCompra: () => Promise<void>;
  abrirRetiro: () => void;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
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

const publicClient = createPublicClient({
  chain: polygon,
  transport: http('https://polygon-mainnet.infura.io/v3/002caff678d04f258bed0609c0957c82'),
});

const InvestUpContext = createContext<InvestUpContextType | null>(null);

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

export function InvestUpProvider({ children }: { children: React.ReactNode }) {
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

  const quoteCacheRef = useRef<{ expiresAt: number; quote: any | null }>({
    expiresAt: 0,
    quote: null,
  });
  const gasPriceCacheRef = useRef<{ expiresAt: number; maxFeePerGas: bigint | null }>({
    expiresAt: 0,
    maxFeePerGas: null,
  });

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

  const pimlicoClient = useMemo(() => {
    if (!PIMLICO_BUNDLER_URL) return null;
    return createPimlicoClient({
      chain: polygon,
      transport: http(PIMLICO_BUNDLER_URL),
    });
  }, []);

  const userAlias = user?.email?.address?.split('@')[0] ?? 'usuario';
  const transferLabel = rolSeleccionado === 'inversor' ? 'Inversiones' : 'Repayments';
  const transferenciaTitulo =
    rolSeleccionado === 'inversor' ? 'Confirmar inversion' : 'Confirmar repayment';

  const registrarTransaccion = useCallback(
    async ({
      txHash,
      toWallet,
      amountUsdc,
      movementType,
      status = 'submitted',
    }: {
      txHash: string;
      toWallet: string;
      amountUsdc: string;
      movementType: MovementType;
      status?: 'submitted' | 'confirmed' | 'failed';
    }) => {
      if (!user?.id || !smartWalletAddress) return;
      try {
        const { error } = await supabase.from('transactions').insert({
          user_id: user.id,
          role: mapRoleToDB(rolSeleccionado),
          movement_type: movementType,
          status,
          chain: 'polygon',
          tx_hash: txHash,
          from_wallet: smartWalletAddress,
          to_wallet: toWallet,
          amount_usdc: amountUsdc,
          metadata: {
            app: 'investup-web',
          },
        });
        if (error) throw error;
      } catch (error: any) {
        console.error('Error guardando transaccion en Supabase:', error?.message ?? error);
      }
    },
    [rolSeleccionado, smartWalletAddress, user?.id]
  );

  const getCachedUsdcQuote = useCallback(async () => {
    if (!pimlicoClient) {
      throw new Error(
        'Falta Pimlico (NEXT_PUBLIC_PIMLICO_API_KEY o NEXT_PUBLIC_PIMLICO_BUNDLER_URL).'
      );
    }

    const now = Date.now();
    if (quoteCacheRef.current.quote && now < quoteCacheRef.current.expiresAt) {
      return quoteCacheRef.current.quote;
    }

    const quotes = await pimlicoClient.getTokenQuotes({ tokens: [USDC_ADDRESS] });
    if (!quotes?.length) throw new Error('Pimlico no devolvio quote para USDC.');

    const quote = quotes[0];
    quoteCacheRef.current = { quote, expiresAt: now + PIMLICO_QUOTE_TTL_MS };
    return quote;
  }, [pimlicoClient]);

  const getCachedMaxFeePerGas = useCallback(async () => {
    const now = Date.now();
    if (gasPriceCacheRef.current.maxFeePerGas && now < gasPriceCacheRef.current.expiresAt) {
      return gasPriceCacheRef.current.maxFeePerGas;
    }

    const fees = await publicClient.estimateFeesPerGas();
    const maxFeePerGas = BigInt(fees.maxFeePerGas ?? fees.gasPrice ?? BigInt(0));
    if (maxFeePerGas <= BigInt(0)) throw new Error('No se pudo estimar maxFeePerGas.');

    gasPriceCacheRef.current = { maxFeePerGas, expiresAt: now + GAS_PRICE_TTL_MS };
    return maxFeePerGas;
  }, []);

  const actualizarSaldos = useCallback(async () => {
    if (!smartWalletAddress) return;
    try {
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
      console.error('Error saldos:', error);
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

        localStorage.setItem(`investup_rol_${user.id}`, rolFrontend);
        setRolSeleccionado(rolFrontend);
        setFaseApp('dashboard');
      } catch (error: any) {
        console.error('Error guardando rol:', error?.message ?? error);
        // Fallback local para evitar bucles de onboarding si Supabase/RLS falla.
        localStorage.setItem(`investup_rol_${user.id}`, rolFrontend);
        setRolSeleccionado(rolFrontend);
        setFaseApp('dashboard');
      }
    },
    [user, smartWalletAddress, supabase]
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
        .select('id,email,role,wallet_address')
        .eq('role', roleTarget)
        .not('wallet_address', 'is', null)
        .neq('id', user.id)
        .order('email', { ascending: true });

      if (error) throw error;
      setWalletTargets((data ?? []) as UserWalletTarget[]);
    } catch (error: any) {
      console.error('Error cargando wallets objetivo:', error?.message ?? error);
    } finally {
      setLoadingWallets(false);
    }
  }, [authenticated, rolSeleccionado, user?.id]);

  const enviarUSDC = useCallback(
    async (destino: string, monto: string) => {
      if (!client || !smartWalletAddress || !destino || !monto) {
        alert('Faltan datos o la wallet no esta lista');
        return;
      }
      if (!destino.startsWith('0x') || destino.length !== 42) {
        alert('Direccion destino invalida');
        return;
      }

      setLoadingTx(true);
      try {
        const montoSolicitado = parseUnits(monto, USDC_DECIMALS);
        if (montoSolicitado <= BigInt(0)) throw new Error('El monto debe ser mayor a 0.');

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
          throw new Error('Saldo insuficiente para monto + gas en USDC.');
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

        const enviadoFmt = Number(formatUnits(montoSolicitado, USDC_DECIMALS)).toFixed(6);
        const tipo = rolSeleccionado === 'inversor' ? 'Inversion' : 'Repayment';
        const movementType: MovementType = rolSeleccionado === 'inversor' ? 'investment' : 'repayment';
        setHistorial((prev) => [`${tipo} ${enviadoFmt} USDC -> ${destino.slice(0, 8)}...`, ...prev]);
        await registrarTransaccion({
          txHash,
          toWallet: destino,
          amountUsdc: enviadoFmt,
          movementType,
        });

        alert(`Transaccion enviada: ${txHash}`);
        await actualizarSaldos();
      } catch (error: any) {
        const message = String(error?.message || error || '');
        if (message.includes('AA21') || message.includes("didn't pay prefund")) {
          alert('Error AA21 del paymaster/bundler. Revisa configuracion de Pimlico.');
        } else {
          alert(`Fallo la operacion: ${message || 'error desconocido'}`);
        }
      } finally {
        setLoadingTx(false);
      }
    },
    [
      client,
      smartWalletAddress,
      getCachedUsdcQuote,
      getCachedMaxFeePerGas,
      rolSeleccionado,
      actualizarSaldos,
      registrarTransaccion,
    ]
  );

  const abrirCompra = useCallback(async () => {
    if (!smartWalletAddress) {
      alert('Espera a que tu Smart Wallet este lista.');
      return;
    }
    await fundWallet({ address: smartWalletAddress as any });
  }, [fundWallet, smartWalletAddress]);

  const abrirRetiro = useCallback(() => {
    if (!smartWalletAddress) {
      alert('Espera a que tu Smart Wallet este lista.');
      return;
    }
    const moonpayUrl = `https://sell.moonpay.com/?apiKey=pk_test_123&baseCurrencyCode=usdc_polygon&walletAddress=${smartWalletAddress}`;
    window.open(moonpayUrl, 'MoonPaySell', 'width=450,height=700');
  }, [smartWalletAddress]);

  const logoutApp = useCallback(async () => {
    if (user?.id) localStorage.removeItem(`investup_rol_${user.id}`);
    await logout();
    setFaseApp('login');
    setRolSeleccionado(null);
    setWalletTargets([]);
    setHistorial([]);
  }, [logout, user?.id]);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !user) {
      setFaseApp('login');
      return;
    }

    const verificarUsuario = async () => {
      const rolLocal = localStorage.getItem(`investup_rol_${user.id}`);
      const rolLocalValido =
        rolLocal === 'inversor' || rolLocal === 'emprendedor' ? (rolLocal as FrontRole) : null;
      const rolLocalDB = mapRoleToDB(rolLocalValido);

      const { data, error } = await supabase
        .from('users')
        .select('role,wallet_address')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error consultando usuario:', error.message);
        if (rolLocalValido) {
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
        if (upsertError) console.error('Error sincronizando usuario:', upsertError.message);
      }

      if (data?.role) {
        const roleFront = mapRoleToFrontend(data.role);
        if (roleFront) {
          localStorage.setItem(`investup_rol_${user.id}`, roleFront);
          setRolSeleccionado(roleFront);
          setFaseApp('dashboard');
          return;
        }
      }

      if (rolLocalValido) {
        setRolSeleccionado(rolLocalValido);
        setFaseApp('dashboard');
        return;
      }

      setFaseApp('onboarding');
    };

    verificarUsuario();
  }, [authenticated, ready, smartWalletAddress, user, supabase]);

  useEffect(() => {
    if (authenticated && smartWalletAddress) {
      actualizarSaldos();
    }
  }, [authenticated, smartWalletAddress, actualizarSaldos]);

  useEffect(() => {
    if (faseApp === 'dashboard') {
      cargarWalletsObjetivo();
    }
  }, [faseApp, cargarWalletsObjetivo]);

  const value: InvestUpContextType = {
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
  };

  return <InvestUpContext.Provider value={value}>{children}</InvestUpContext.Provider>;
}

export function useInvestUp() {
  const ctx = useContext(InvestUpContext);
  if (!ctx) throw new Error('useInvestUp debe usarse dentro de InvestUpProvider');
  return ctx;
}
