'use client';

import { useSmartWallets, SmartWalletsProvider } from '@privy-io/react-auth/smart-wallets';
import { PrivyProvider, usePrivy, useFundWallet } from '@privy-io/react-auth';
import { useState, useEffect, useMemo } from 'react';
import { createPublicClient, http, formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { polygon } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';
import { createPimlicoClient } from 'permissionless/clients/pimlico';

// --- CONFIGURACION SUPABASE ---
const SUPABASE_URL = 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- CONFIGURACION CONTRATO CRYPTO---
const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const USDC_ABI = [
  { name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'allowance', type: 'function', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'transfer', type: 'function', inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }
];

const USDC_DECIMALS = 6;
const MAX_UINT256 = (BigInt(1) << BigInt(256)) - BigInt(1);
const GAS_BUFFER_BPS = BigInt(10500);

const PIMLICO_API_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
const PIMLICO_CHAIN_ID = 137;
const PIMLICO_BUNDLER_URL =
  process.env.NEXT_PUBLIC_PIMLICO_BUNDLER_URL ||
  (PIMLICO_API_KEY ? `https://api.pimlico.io/v2/${PIMLICO_CHAIN_ID}/rpc?apikey=${PIMLICO_API_KEY}` : '');

// --- CONFIGURACION RPC ---
const publicClient = createPublicClient({
  chain: polygon,
  transport: http(`https://polygon-mainnet.infura.io/v3/002caff678d04f258bed0609c0957c82`)
});


// --- APLICACION PRINCIPAL ---
function BilleteraApp() {
  const { login, logout, authenticated, user, ready } = usePrivy();
  const { fundWallet } = useFundWallet(); 
  
  // 2. Obtenemos el cliente de la Smart Wallet
  const { client } = useSmartWallets();
  const smartWalletAddress = client?.account?.address;
  const [faseApp, setFaseApp] = useState<'loading' | 'login' | 'onboarding' | 'dashboard'>('loading');
  const [rolSeleccionado, setRolSeleccionado] = useState<'inversor' | 'emprendedor' | null>(null);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [vista, setVista] = useState<'inicio' | 'enviar'>('inicio');
  const [balanceUSDC, setBalanceUSDC] = useState('0.00');
  const [balancePOL, setBalancePOL] = useState('0.00');
  const [historial, setHistorial] = useState<string[]>([]);
  const [destino, setDestino] = useState('');
  const [monto, setMonto] = useState('');
  const [loading, setLoading] = useState(false);

  const pimlicoClient = useMemo(() => {
    if (!PIMLICO_BUNDLER_URL) return null;
    return createPimlicoClient({
      chain: polygon,
      transport: http(PIMLICO_BUNDLER_URL),
    });
  }, []);

  const guardarRolEnBaseDeDatos = async (rolFrontend: 'inversor' | 'emprendedor') => {
    // Usamos smartWalletAddress en lugar de walletEmbebida
    if (!user || !smartWalletAddress) return;

    const rolParaDB = rolFrontend === 'inversor' ? 'investor' : 'entrepreneur';

    try {
      const { error } = await supabase
        .from('users') 
        .upsert({ 
          id: user.id, 
          email: user.email?.address, 
          role: rolParaDB, 
          wallet_address: smartWalletAddress // Guardamos la direccion inteligente
        });

      if (error) throw error;

      localStorage.setItem(`investup_rol_${user.id}`, rolFrontend);
      setRolSeleccionado(rolFrontend);
      setFaseApp('dashboard');
    } catch (error: any) {
      console.error("Error Supabase:", error.message);
    }
    };

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !user) { setFaseApp('login'); return; }

    const verificarUsuario = async () => {
      const rolLocal = localStorage.getItem(`investup_rol_${user.id}`);
      if (rolLocal) {
        setRolSeleccionado(rolLocal as any);
        setFaseApp('dashboard');
        return;
      }

      const { data } = await supabase.from('users').select('role').eq('id', user.id).single();

      if (data?.role) {
        const rolTraducido = data.role === 'investor' ? 'inversor' : 'emprendedor';
        localStorage.setItem(`investup_rol_${user.id}`, rolTraducido);
        setRolSeleccionado(rolTraducido as any);
        setFaseApp('dashboard');
      } else {
        setFaseApp('onboarding');
      }
    };
    verificarUsuario();
  }, [ready, authenticated, user]);

// 3. Tu función de saldos (asegurando el casting a 0x${string})
const actualizarSaldos = async () => {
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
    } catch (e) { console.error("Error saldos:", e); }
  };

useEffect(() => {
    if (authenticated && smartWalletAddress) actualizarSaldos();
  }, [authenticated, smartWalletAddress]);


  // --- RESTO DE FUNCIONES (Igual que antes) ---
  const completarOnboarding = () => {
    if (!rolSeleccionado || !aceptaTerminos) return;
    localStorage.setItem(`investup_rol_${user?.id}`, rolSeleccionado);
    setFaseApp('dashboard');
  };

// --- FUNCIÓN DE ENVÍO CON SPONSORSHIP ---
  const enviarUSDC = async () => {
    if (!client || !smartWalletAddress || !destino || !monto) return alert("Faltan datos o wallet no lista");
    if (!destino.startsWith('0x') || destino.length !== 42) return alert('Direccion destino invalida');

    setLoading(true);
    try {
      const montoSolicitado = parseUnits(monto, USDC_DECIMALS);
      if (montoSolicitado <= BigInt(0)) {
        throw new Error('El monto debe ser mayor a 0.');
      }

      const paymasterContext = { token: USDC_ADDRESS };
      if (!pimlicoClient) {
        throw new Error('Falta configurar Pimlico (NEXT_PUBLIC_PIMLICO_API_KEY o NEXT_PUBLIC_PIMLICO_BUNDLER_URL).');
      }

      const quotes = await pimlicoClient.getTokenQuotes({
        tokens: [USDC_ADDRESS],
      });

      if (!quotes?.length) {
        throw new Error('Pimlico no devolvio quote para USDC en esta red.');
      }

      const quote = quotes[0];

      const transferData = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [destino as `0x${string}`, montoSolicitado],
      });

      // Estimamos el costo maximo con una UO que incluye approve + transfer.
      const estimateUserOp = await (client as any).prepareUserOperation({
        calls: [
          {
            to: USDC_ADDRESS,
            value: BigInt(0),
            data: encodeFunctionData({
              abi: USDC_ABI,
              functionName: 'approve',
              args: [quote.paymaster as `0x${string}`, MAX_UINT256],
            }),
          },
          { to: USDC_ADDRESS, value: BigInt(0), data: transferData },
        ],
        paymasterContext,
      });

      const maxFeePerGas = BigInt(estimateUserOp.maxFeePerGas);
      const maxGas =
        BigInt(estimateUserOp.preVerificationGas) +
        BigInt(estimateUserOp.callGasLimit) +
        BigInt(estimateUserOp.verificationGasLimit) +
        BigInt(estimateUserOp.paymasterVerificationGasLimit ?? BigInt(0)) +
        BigInt(estimateUserOp.paymasterPostOpGasLimit ?? BigInt(0));

      const maxCostNative = maxGas * maxFeePerGas;
      let gasCostUsdc =
        ((maxCostNative + BigInt(quote.postOpGas) * maxFeePerGas) * BigInt(quote.exchangeRate)) /
        (BigInt(10) ** BigInt(18));

      // Buffer del 5% para evitar underestimation.
      gasCostUsdc = (gasCostUsdc * GAS_BUFFER_BPS) / BigInt(10000);

      if (gasCostUsdc >= montoSolicitado) {
        throw new Error('El monto no alcanza para cubrir gas en USDC.');
      }

      const montoNeto = montoSolicitado - gasCostUsdc;

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
          args: [destino as `0x${string}`, montoNeto],
        }),
      });

      const txHash = await client.sendTransaction({
        calls,
        paymasterContext,
      } as any);

      const gasUsdcFmt = Number(formatUnits(gasCostUsdc, USDC_DECIMALS)).toFixed(6);
      const netoFmt = Number(formatUnits(montoNeto, USDC_DECIMALS)).toFixed(6);

      setHistorial([
        `Envio neto ${netoFmt} USDC (gas ${gasUsdcFmt} USDC via Pimlico)`,
        ...historial,
      ]);
      alert(`Enviado. Hash: ${txHash}`);
      setVista('inicio');
      actualizarSaldos();
    } catch (error: any) {
      console.error("Error:", error);
      const msg = String(error?.message || error || '');
      if (msg.includes('AA21') || msg.includes("didn't pay prefund")) {
        alert('Fallo paymaster/bundler Pimlico (AA21). Revisa paymaster/token config.');
      } else {
        alert("Fallo el envio: " + (error?.message || 'Error desconocido'));
      }
    } finally {
      setLoading(false);
    }
  };

const abrirRetiro = () => {
  if (!smartWalletAddress) {
    return alert("Espera un momento a que tu Smart Wallet esté lista...");
  }
  const moonpayUrl = `https://sell.moonpay.com/?apiKey=pk_test_123&baseCurrencyCode=usdc_polygon&walletAddress=${smartWalletAddress}`;
  window.open(moonpayUrl, 'MoonPaySell', 'width=450,height=700');
};

  // --- RENDERIZADO (Tus estilos originales) ---
  if (faseApp === 'login' || faseApp === 'loading') {
    return (
      <main style={estilos.contenedor}>
        <div style={estilos.cardLogin}>
          <h1 style={{color: '#676FFF', marginBottom: '10px'}}>InvestUp 🏦</h1>
          <p style={{color: '#666', marginBottom: '30px'}}>Plataforma de Inversión Descentralizada</p>
          <button onClick={login} style={estilos.botonPrimario}>🔑 Entrar / Registrarse</button>
        </div>
      </main>
    );
  }

  if (faseApp === 'onboarding') {
    return (
      <main style={estilos.contenedor}>
        <div style={{...estilos.cardApp, maxWidth: '450px'}}>
          <h2 style={{color: '#333', textAlign: 'center'}}>Bienvenido a InvestUp</h2>
          <div style={estilos.gridRoles}>
            <div onClick={() => guardarRolEnBaseDeDatos('inversor')} style={{...estilos.cardRol, border: rolSeleccionado === 'inversor' ? '2px solid #676FFF' : '1px solid #ddd', backgroundColor: rolSeleccionado === 'inversor' ? '#f0f4ff' : 'white'}}>
              <div style={{fontSize: '30px'}}>📈</div>
              <h3>Soy Inversor</h3>
            </div>
            <div onClick={() => guardarRolEnBaseDeDatos('emprendedor')} style={{...estilos.cardRol, border: rolSeleccionado === 'emprendedor' ? '2px solid #676FFF' : '1px solid #ddd', backgroundColor: rolSeleccionado === 'emprendedor' ? '#f0f4ff' : 'white'}}>
              <div style={{fontSize: '30px'}}>🚀</div>
              <h3>Soy Emprendedor</h3>
            </div>
          </div>
          <div style={{marginTop: '30px'}}>
            <input type="checkbox" checked={aceptaTerminos} onChange={(e) => setAceptaTerminos(e.target.checked)} id="terminos" />
            <label htmlFor="terminos" style={{marginLeft: '10px'}}>Acepto términos y condiciones</label>
          </div>
          <button onClick={completarOnboarding} disabled={!rolSeleccionado || !aceptaTerminos} style={estilos.botonPrimario}>Continuar</button>
        </div>
      </main>
    );
  }

  return (
    <main style={estilos.contenedor}>
      <div style={estilos.cardApp}>
        <div style={estilos.header}>
            <div>
              <div style={{fontSize: '12px', color: '#888'}}>Hola, {user?.email?.address?.split('@')[0]}</div>
              <div style={estilos.badgeRol}>{rolSeleccionado === 'inversor' ? '📈 Inversor' : '🚀 Emprendedor'}</div>
            </div>
            <button onClick={() => { logout(); localStorage.removeItem(`investup_rol_${user?.id}`); }} style={estilos.botonSalir}>Salir</button>
        </div>

        {vista === 'inicio' ? (
          <>
            <div style={estilos.seccionSaldo}>
                <p style={{fontSize: '14px', color: '#666'}}>Balance Smart Wallet</p>
                <h1 style={{fontSize: '42px', color: '#333'}}>${balanceUSDC}</h1>
                <div style={estilos.badgePol}>⛽ Gas Patrocinado por InvestUp</div>
            </div>
            <div style={estilos.gridBotones}>
                <button onClick={() => setVista('enviar')} style={estilos.botonAccion}>💸 Enviar</button>
                <button onClick={() => fundWallet({ address: smartWalletAddress as any })} style={{...estilos.botonAccion, backgroundColor: '#676FFF', color: 'white'}}>💳 Comprar</button>
                <button onClick={abrirRetiro} style={{...estilos.botonAccion, backgroundColor: '#FF6767', color: 'white'}}>🏦 Retirar</button>
            </div>
            <button onClick={actualizarSaldos} style={{...estilos.botonAccionSecundario, marginTop: '15px', width: '100%'}}>🔄 Refrescar saldo</button>
            <div style={estilos.listaHistorial}>
                <h4 style={{margin: '0 0 10px 0', color: '#555'}}>Actividad Reciente</h4>
                {historial.length === 0 ? (
                    <p style={{fontSize: '12px', color: '#999', fontStyle: 'italic'}}>No hay movimientos en esta sesión.</p>
                ) : (
                    historial.map((item, i) => (
                        <div key={i} style={estilos.itemHistorial}>{item}</div>
                    ))
                )}
            </div>
            <div style={estilos.footerDir}>
              <p style={{fontSize: '10px', margin: 0, color: '#676FFF', fontWeight: 'bold'}}>
                Tu Bóveda Inteligente (Gas Gratis ⛽):
                </p>
                <code style={{fontSize: '9px', wordBreak: 'break-all'}}>
                  {smartWalletAddress || 'Generando dirección...'}
                  </code>
                  <p style={{fontSize: '9px', margin: '6px 0 0 0', color: '#888'}}>
                    Pimlico ERC20 paymaster activo
                  </p>
                  </div>
          </>
        ) : (
          <div style={estilos.formEnvio}>
            <h2>Enviar Dinero</h2>
            <input placeholder="Dirección 0x..." value={destino} onChange={(e) => setDestino(e.target.value)} style={estilos.input} />
            <input type="number" placeholder="0.00" value={monto} onChange={(e) => setMonto(e.target.value)} style={estilos.inputMonto} />
            <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                <button onClick={() => setVista('inicio')} style={estilos.botonCancelar}>Cancelar</button>
                <button onClick={() => enviarUSDC()} disabled={loading} style={estilos.botonConfirmar}>{loading ? 'Enviando...' : 'Confirmar'}</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// --- ESTILOS (Tus estilos originales) ---
const estilos: any = {
  contenedor: { minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" },
  cardLogin: { background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', width: '90%', maxWidth: '350px' },
  cardApp: { background: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '380px', minHeight: '500px', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  botonPrimario: { width: '100%', padding: '15px', background: '#676FFF', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
  botonSalir: { background: '#fff0f0', color: '#ff4d4d', border: 'none', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' },
  seccionSaldo: { textAlign: 'center', padding: '20px 0', borderBottom: '1px solid #f0f0f0' },
  badgePol: { display: 'inline-block', background: '#eef2ff', color: '#676FFF', padding: '5px 10px', borderRadius: '15px', fontSize: '11px' },
  badgeRol: { display: 'inline-block', background: '#F3F4F6', color: '#333', padding: '3px 8px', borderRadius: '5px', fontSize: '10px', marginTop: '4px' },
  gridBotones: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '25px' },
  botonAccion: { background: '#111', color: 'white', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  botonAccionSecundario: { background: 'white', color: '#111', border: '1px solid #ddd', padding: '12px', borderRadius: '12px', cursor: 'pointer' },
  footerDir: { marginTop: 'auto', textAlign: 'center', background: '#f9f9f9', padding: '10px', borderRadius: '12px', fontSize: '10px', overflow: 'hidden' },
  formEnvio: { display: 'flex', flexDirection: 'column' },
  input: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '15px' },
  inputMonto: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '24px' },
  botonCancelar: { flex: 1, padding: '15px', background: '#f0f0f0', borderRadius: '12px', border: 'none' },
  botonConfirmar: { flex: 1, padding: '15px', background: '#676FFF', color: 'white', borderRadius: '12px', border: 'none' },
  gridRoles: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' },
  cardRol: { padding: '20px', borderRadius: '16px', textAlign: 'center', cursor: 'pointer' },
};

export default function Home() {
  // Privy sponsorship policy: créala en el dashboard (Polygon) y guárdala en .env.local

  return (
    <PrivyProvider
      appId="cmlohriz801350cl7vrwvdb3i" 
      config={{
        appearance: { 
          theme: 'light', 
          accentColor: '#676FFF', 
          showWalletLoginFirst: false 
        },
        supportedChains: [polygon],
        // Evita el warning de Solana cuando no usamos conectores Solana en esta app.
        loginMethods: ['email'],
        embeddedWallets: { 
          ethereum: { createOnLogin: 'users-without-wallets' } 
        },
        
      }}
    >
      {/*Activamos Smart Wallets + contexto del paymaster para gas sponsorship */}
      <SmartWalletsProvider
        config={{
          paymasterContext: { token: USDC_ADDRESS },
        }}
      >
        <BilleteraApp />
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}