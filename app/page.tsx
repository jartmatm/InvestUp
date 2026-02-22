'use client';

import { PrivyProvider, usePrivy, useFundWallet } from '@privy-io/react-auth';
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets'; // <-- NUEVO IMPORT MÁGICO
import { useState, useEffect } from 'react';
import { createPublicClient, http, formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { polygon } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN SUPABASE ---
const SUPABASE_URL = 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- CONFIGURACIÓN CONTRATO CRYPTO---
const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const USDC_ABI = [
  { name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'transfer', type: 'function', inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }
];

// --- CONFIGURACION RPC ---
const publicClient = createPublicClient({
  chain: polygon,
  transport: http(`https://polygon-mainnet.infura.io/v3/002caff678d04f258bed0609c0957c82`)
});

// --- APLICACIÓN PRINCIPAL ---
function BilleteraApp() {
  const { login, logout, authenticated, user, ready } = usePrivy();
  const { fundWallet } = useFundWallet(); 
  
  // 🦍 AQUÍ ESTÁ EL CEREBRO DE LA SMART WALLET
  const { client } = useSmartWallets();
  const smartWalletAddress = client?.account?.address as `0x${string}` | undefined;

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

  // 1. Función para guardar en la base de datos
  const guardarRolEnBaseDeDatos = async (rolFrontend: 'inversor' | 'emprendedor') => {
    // 🛑 Esperamos a que la Smart Wallet esté lista
    if (!user || !smartWalletAddress) {
      alert("Espera un segundo, estamos creando tu bóveda inteligente...");
      return;
    }

    const rolParaDB = rolFrontend === 'inversor' ? 'investor' : 'entrepreneur';

    try {
      const { error } = await supabase
        .from('users') 
        .upsert({ 
          id: user.id, 
          email: user.email?.address, 
          role: rolParaDB,
          wallet_address: smartWalletAddress // ✅ Ahora guardamos la Smart Wallet
        });

      if (error) throw error;

      localStorage.setItem(`investup_rol_${user.id}`, rolFrontend);
      setRolSeleccionado(rolFrontend);
      setFaseApp('dashboard');
      
      console.log("✅ ¡Guardado en Supabase correctamente!");
    } catch (error: any) {
      console.error("❌ Error real de Supabase:", error.message);
      alert("Error: " + error.message);
    }
  };

  useEffect(() => {
    if (!ready) {
      setFaseApp('loading');
      return;
    }

    if (!authenticated || !user) {
      setFaseApp('login');
      return;
    }

    const verificarUsuario = async () => {
      const rolLocal = localStorage.getItem(`investup_rol_${user.id}`);
      if (rolLocal) {
        setRolSeleccionado(rolLocal as any);
        setFaseApp('dashboard');
        return; 
      }

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

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

  // 3. Consultar saldos a la nueva Smart Wallet
  const actualizarSaldos = async () => {
    if (!smartWalletAddress) return;
    try {
      const balPol = await publicClient.getBalance({ address: smartWalletAddress });
      setBalancePOL(Number(formatUnits(balPol, 18)).toFixed(4));

      const balUsdc = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [smartWalletAddress],
      });
      
      const saldoFinal = Number(formatUnits(balUsdc as bigint, 6)).toFixed(2);
      setBalanceUSDC(saldoFinal);
      console.log("Saldo USDC recuperado:", saldoFinal);
    } catch (e) {
      console.error("Error leyendo saldos:", e);
    }
  };

  useEffect(() => {
    if (!authenticated || !smartWalletAddress) return;
    refrescarSaldo();
  }, [authenticated, smartWalletAddress]);

  const refrescarSaldo = async () => {
    try {
      await actualizarSaldos();
    } catch (err) {
      console.error("Error refrescando saldo:", err);
    }
  };

  const completarOnboarding = () => {
    if (!rolSeleccionado || !aceptaTerminos) return;
    localStorage.setItem(`investup_rol_${user?.id}`, rolSeleccionado);
    setFaseApp('dashboard');
  };

  // 🚀 LA MAGIA: Enviar USDC SIN GAS POL
  const enviarUSDC = async (destinoAddr?: string, cantidadBigInt?: bigint) => {
    const destAddr = destinoAddr || destino;
    const cantBig = cantidadBigInt || parseUnits(monto, 6);

    if (!client || !smartWalletAddress || !destAddr || !monto) return alert("Faltan datos o Billetera no lista");
    setLoading(true);

    try {
      // 1. Empaquetamos la instrucción para el contrato de USDC
      const data = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [destAddr as `0x${string}`, cantBig],
      });

      // 2. Le decimos al cliente de la Smart Wallet que dispare (Privy paga el gas)
      const txHash = await client.sendTransaction({
        to: USDC_ADDRESS as `0x${string}`,
        data: data,
      });

      setHistorial([`Envío de ${monto} USDC a ${destAddr.slice(0,6)}...`, ...historial]);
      alert(`✅ ¡Enviado sin gas! Hash: ${txHash}`);
      setDestino(''); setMonto(''); setVista('inicio');
      
      await refrescarSaldo();
    } catch (error: any) {
      console.error("Error enviando USDC:", error);
      alert("❌ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const abrirRetiro = () => {
    if (!smartWalletAddress) return alert("Conecta tu wallet primero");
    const moonpayUrl = `https://sell.moonpay.com/?apiKey=pk_test_123&baseCurrencyCode=usdc_polygon&walletAddress=${smartWalletAddress}`;
    window.open(moonpayUrl, 'MoonPaySell', 'width=450,height=700');
  };

  // --- RENDERIZADO (Estilos sin tocar) ---
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
                <p style={{fontSize: '14px', color: '#666'}}>Balance Total</p>
                <h1 style={{fontSize: '42px', color: '#333'}}>${balanceUSDC} <span style={{fontSize: '16px'}}>USDC</span></h1>
                <div style={estilos.badgePol}>⛽ Gas Sponsoreado</div>
            </div>
            <div style={estilos.gridBotones}>
                <button onClick={() => setVista('enviar')} style={estilos.botonAccion}>💸 Enviar</button>
                <button onClick={() => fundWallet({ address: smartWalletAddress as any })} style={{...estilos.botonAccion, backgroundColor: '#676FFF', color: 'white'}}>💳 Comprar</button>
                <button onClick={abrirRetiro} style={{...estilos.botonAccion, backgroundColor: '#FF6767', color: 'white'}}>🏦 Retirar</button>
            </div>
            <button onClick={refrescarSaldo} style={{...estilos.botonAccionSecundario, marginTop: '15px', width: '100%'}}>🔄 Refrescar saldo</button>
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
              <p style={{fontSize: '10px', margin: 0}}>Tu Smart Wallet (No requiere POL):</p>
               <code>{smartWalletAddress || 'Cargando...'}</code>
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

// --- ESTILOS ---
const estilos: any = {
  contenedor: { minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" },
  cardLogin: { background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', width: '90%', maxWidth: '350px' },
  cardApp: { background: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '380px', minHeight: '500px', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  botonPrimario: { width: '100%', padding: '15px', background: '#676FFF', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
  botonSalir: { background: '#fff0f0', color: '#ff4d4d', border: 'none', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' },
  seccionSaldo: { textAlign: 'center', padding: '20px 0', borderBottom: '1px solid #f0f0f0' },
  badgePol: { display: 'inline-block', background: '#eef2ff', color: '#676FFF', padding: '5px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold' },
  badgeRol: { display: 'inline-block', background: '#F3F4F6', color: '#333', padding: '3px 8px', borderRadius: '5px', fontSize: '10px', marginTop: '4px' },
  gridBotones: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '25px' },
  botonAccion: { background: '#111', color: 'white', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  botonAccionSecundario: { background: 'white', color: '#111', border: '1px solid #ddd', padding: '12px', borderRadius: '12px', cursor: 'pointer' },
  footerDir: { marginTop: 'auto', textAlign: 'center', background: '#f9f9f9', padding: '10px', borderRadius: '12px', fontSize: '10px', overflow: 'hidden' },
  formEnvio: { display: 'flex', flexDirection: 'column' },
  input: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '15px' },
  inputMonto: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '24px' },
  botonCancelar: { flex: 1, padding: '15px', background: '#f0f0f0', borderRadius: '12px', border: 'none', cursor: 'pointer' },
  botonConfirmar: { flex: 1, padding: '15px', background: '#676FFF', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer' },
  gridRoles: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' },
  cardRol: { padding: '20px', borderRadius: '16px', textAlign: 'center', cursor: 'pointer' },
};

export default function Home() {
  return (
    <PrivyProvider
      appId="cmlohriz801350cl7vrwvdb3i" 
      config={{
        appearance: { theme: 'light', accentColor: '#676FFF', showWalletLoginFirst: false },
        supportedChains: [polygon],
        embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } },
      }}
    >
      <BilleteraApp />
    </PrivyProvider>
  );
}