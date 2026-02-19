'use client';

import { PrivyProvider, usePrivy, useWallets, useFundWallet } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { createPublicClient, http, formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { polygon } from 'viem/chains';

// --- CONFIGURACIÓN ---
const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const USDC_ABI = [
  { name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'transfer', type: 'function', inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }
];

const publicClient = createPublicClient({ 
  chain: polygon, 
  transport: http('https://polygon-rpc.com') // <--- Forzamos un nodo público estable 
});

function BilleteraApp() {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { fundWallet } = useFundWallet(); 
  const walletEmbebida = wallets.find((w) => w.walletClientType === 'privy');

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

  // --- EFECTO: CONTROL DE FLUJO ---
  useEffect(() => {
    if (!authenticated) {
      setFaseApp('login');
      return;
    }
    const rolGuardado = localStorage.getItem(`investup_rol_${user?.id}`);
    if (rolGuardado) {
      setRolSeleccionado(rolGuardado as any);
      setFaseApp('dashboard');
    } else {
      setFaseApp('onboarding');
    }
  }, [authenticated, user]);

  // --- EFECTO: SALDOS (CORREGIDO) ---
  const actualizarSaldos = async () => {
    // Si no hay dirección todavía, no intentamos nada
    if (!walletEmbebida?.address) return;
    
    try {
      console.log("Consultando saldos para:", walletEmbebida.address);
      
      // Consultar POL
      const balPol = await publicClient.getBalance({ address: walletEmbebida.address as `0x${string}` });
      setBalancePOL(Number(formatUnits(balPol, 18)).toFixed(4));

      // Consultar USDC
      const balUsdc = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [walletEmbebida.address as `0x${string}`],
      });
      
      const saldoFinal = Number(formatUnits(balUsdc as bigint, 6)).toFixed(2);
      setBalanceUSDC(saldoFinal);
      console.log("Saldo USDC recuperado:", saldoFinal);
      
    } catch (e) {
      console.error("Error leyendo saldos:", e);
    }
  };

  // Este useEffect es el que fallaba. Ahora depende de la dirección física de la wallet.
  useEffect(() => {
    if (faseApp === 'dashboard' && walletEmbebida?.address) {
      actualizarSaldos();
      
      // Opcional: refresco automático cada 15 segundos para asegurar
      const interval = setInterval(actualizarSaldos, 15000);
      return () => clearInterval(interval);
    }
  }, [faseApp, walletEmbebida?.address]); // <--- CAMBIO CLAVE AQUÍ

  // --- RESTO DE FUNCIONES (Igual que antes) ---
  const completarOnboarding = () => {
    if (!rolSeleccionado || !aceptaTerminos) return;
    localStorage.setItem(`investup_rol_${user?.id}`, rolSeleccionado);
    setFaseApp('dashboard');
  };

  const enviarUSDC = async () => {
    if (!walletEmbebida || !destino || !monto) return alert("Faltan datos");
    setLoading(true);
    try {
      await walletEmbebida.switchChain(polygon.id);
      const provider = await walletEmbebida.getEthereumProvider();
      const montoWei = parseUnits(monto, 6);
      const data = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [destino as `0x${string}`, montoWei],
      });
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletEmbebida.address, to: USDC_ADDRESS, data }],
      });
      setHistorial([`Envío de ${monto} USDC a ${destino.slice(0,6)}...`, ...historial]);
      alert(`✅ ¡Enviado! Hash: ${txHash}`);
      setDestino(''); setMonto(''); setVista('inicio');
      setTimeout(actualizarSaldos, 3000);
    } catch (e: any) {
      alert("❌ Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const abrirRetiro = () => {
    if (!walletEmbebida?.address) return alert("Conecta tu wallet primero");
    const moonpayUrl = `https://sell.moonpay.com/?apiKey=pk_test_123&baseCurrencyCode=usdc_polygon&walletAddress=${walletEmbebida.address}`;
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
            <div onClick={() => setRolSeleccionado('inversor')} style={{...estilos.cardRol, border: rolSeleccionado === 'inversor' ? '2px solid #676FFF' : '1px solid #ddd', backgroundColor: rolSeleccionado === 'inversor' ? '#f0f4ff' : 'white'}}>
              <div style={{fontSize: '30px'}}>📈</div>
              <h3>Soy Inversor</h3>
            </div>
            <div onClick={() => setRolSeleccionado('emprendedor')} style={{...estilos.cardRol, border: rolSeleccionado === 'emprendedor' ? '2px solid #676FFF' : '1px solid #ddd', backgroundColor: rolSeleccionado === 'emprendedor' ? '#f0f4ff' : 'white'}}>
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
                <div style={estilos.badgePol}>⛽ Gas: {balancePOL} POL</div>
            </div>
            <div style={estilos.gridBotones}>
                <button onClick={() => setVista('enviar')} style={estilos.botonAccion}>💸 Enviar</button>
                <button onClick={() => fundWallet({ address: walletEmbebida?.address as any })} style={{...estilos.botonAccion, backgroundColor: '#676FFF', color: 'white'}}>💳 Comprar</button>
                <button onClick={abrirRetiro} style={{...estilos.botonAccion, backgroundColor: '#FF6767', color: 'white'}}>🏦 Retirar</button>
            </div>
            <button onClick={actualizarSaldos} style={{...estilos.botonAccionSecundario, marginTop: '15px', width: '100%'}}>🔄 Actualizar Saldo</button>
            <div style={estilos.footerDir}>
               <code>{walletEmbebida?.address}</code>
            </div>
          </>
        ) : (
          <div style={estilos.formEnvio}>
            <h2>Enviar Dinero</h2>
            <input placeholder="Dirección 0x..." value={destino} onChange={(e) => setDestino(e.target.value)} style={estilos.input} />
            <input type="number" placeholder="0.00" value={monto} onChange={(e) => setMonto(e.target.value)} style={estilos.inputMonto} />
            <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                <button onClick={() => setVista('inicio')} style={estilos.botonCancelar}>Cancelar</button>
                <button onClick={enviarUSDC} disabled={loading} style={estilos.botonConfirmar}>{loading ? 'Enviando...' : 'Confirmar'}</button>
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