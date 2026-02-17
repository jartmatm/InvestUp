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

const publicClient = createPublicClient({ chain: polygon, transport: http() });

function BilleteraApp() {
  const { login, logout, authenticated, user, updateMetadata } = usePrivy();
  const { wallets } = useWallets();
  const { fundWallet } = useFundWallet(); 
  const walletEmbebida = wallets.find((w) => w.walletClientType === 'privy');

  // Estados
  const [rol, setRol] = useState<string | null>(null);
  const [vista, setVista] = useState<'inicio' | 'enviar'>('inicio');
  const [balanceUSDC, setBalanceUSDC] = useState('0.00');
  const [balancePOL, setBalancePOL] = useState('0.00');
  const [loading, setLoading] = useState(false);

  // Sincronizar Rol desde Privy
  useEffect(() => {
    if (user?.customMetadata?.role) {
      setRol(user.customMetadata.role as string);
    }
  }, [user]);

  const actualizarSaldos = async () => {
    if (!walletEmbebida?.address) return;
    try {
      const balPol = await publicClient.getBalance({ address: walletEmbebida.address as `0x${string}` });
      setBalancePOL(Number(formatUnits(balPol, 18)).toFixed(4));
      const balUsdc = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [walletEmbebida.address],
      });
      setBalanceUSDC(Number(formatUnits(balUsdc as bigint, 6)).toFixed(2));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (authenticated && walletEmbebida) actualizarSaldos();
  }, [authenticated, walletEmbebida]);

  // Manejar Login con Rol
  const iniciarRegistro = async (tipoRol: 'inversionista' | 'emprendedor') => {
    // Guardamos el rol temporalmente para actualizarlo tras el login
    localStorage.setItem('pending_role', tipoRol);
    login();
  };

  // Efecto para asignar el rol después de loguearse por primera vez
  useEffect(() => {
    const pendingRole = localStorage.getItem('pending_role');
    if (authenticated && pendingRole && !user?.customMetadata?.role) {
      updateMetadata({ role: pendingRole });
      setRol(pendingRole);
      localStorage.removeItem('pending_role');
    }
  }, [authenticated, user, updateMetadata]);

  // --- PANTALLA DE LOGIN (MODERNA) ---
  if (!authenticated) {
    return (
      <main style={estilos.contenedor}>
        <div style={estilos.cardLogin}>
          <div style={estilos.logo}>🏦</div>
          <h1 style={estilos.tituloLogo}>InvestUp</h1>
          <p style={estilos.claim}>“Invierte mejor que un CDT.<br/>Financia el crecimiento real.”</p>
          
          <div style={estilos.grupoBotonesLogin}>
            <button onClick={() => iniciarRegistro('inversionista')} style={estilos.botonRolInv}>
              🚀 Registrarme como Inversionista
              <span style={estilos.subTextoBoton}>Quiero hacer crecer mi capital</span>
            </button>
            
            <button onClick={() => iniciarRegistro('emprendedor')} style={estilos.botonRolEmp}>
              🏗️ Registrarme como Emprendedor
              <span style={estilos.subTextoBoton}>Busco financiar mi proyecto</span>
            </button>
          </div>
          
          <p style={estilos.footerLogin}>Seguridad Blockchain de grado bancario</p>
        </div>
      </main>
    );
  }

  // --- PANTALLA PRINCIPAL (DASHBOARD) ---
  return (
    <main style={estilos.contenedor}>
      <div style={estilos.cardApp}>
        <div style={estilos.header}>
            <div style={estilos.tagRol}>{rol?.toUpperCase()}</div>
            <button onClick={logout} style={estilos.botonSalir}>Salir</button>
        </div>

        <div style={estilos.seccionSaldo}>
            <p style={{fontSize: '14px', color: '#666', margin: 0}}>Balance Disponible</p>
            <h1 style={{fontSize: '42px', margin: '5px 0', color: '#333'}}>${balanceUSDC} <span style={{fontSize: '16px'}}>USDC</span></h1>
            <div style={estilos.badgePol}>⛽ Red Polygon activa</div>
        </div>

        <div style={estilos.gridBotones}>
            <button onClick={() => setVista('enviar')} style={estilos.botonAccion}>💸 Enviar</button>
            <button 
                onClick={() => fundWallet({ address: walletEmbebida?.address as any })} 
                style={{...estilos.botonAccion, backgroundColor: '#676FFF', color: 'white'}}
            >
              💳 Comprar
            </button>
            <button style={{...estilos.botonAccion, backgroundColor: '#111', color: 'white'}}>🏦 Retirar</button>
        </div>

        <div style={estilos.infoCard}>
          <h4 style={{margin: '0 0 5px 0'}}>Próximamente ⚡</h4>
          <p style={{fontSize: '12px', margin: 0, color: '#666'}}>
            {rol === 'inversionista' 
              ? 'Verás proyectos reales para invertir tus USDC.' 
              : 'Podrás publicar tu proyecto y recibir fondeo.'}
          </p>
        </div>

        <div style={estilos.footerDir}>
           <p style={{fontSize: '10px', margin: 0}}>Billetera Protegida:</p> 
           <code style={{fontSize: '10px', color: '#676FFF'}}>{walletEmbebida?.address?.slice(0,10)}...{walletEmbebida?.address?.slice(-4)}</code>
        </div>
      </div>
    </main>
  );
}

// --- ESTILOS ACTUALIZADOS ---
const estilos: any = {
  contenedor: { 
    minHeight: '100vh', 
    background: 'radial-gradient(circle at top right, #eef2ff, #f5f7fa)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontFamily: "'Inter', sans-serif",
    padding: '20px'
  },
  cardLogin: { 
    background: 'rgba(255, 255, 255, 0.8)', 
    backdropFilter: 'blur(10px)',
    padding: '40px 30px', 
    borderRadius: '32px', 
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', 
    textAlign: 'center', 
    width: '100%', 
    maxWidth: '400px',
    border: '1px solid white'
  },
  logo: { fontSize: '50px', marginBottom: '10px' },
  tituloLogo: { fontSize: '28px', fontWeight: '800', color: '#1a1a1a', margin: '0', letterSpacing: '-1px' },
  claim: { fontSize: '16px', color: '#4b5563', lineHeight: '1.5', margin: '15px 0 35px 0', fontWeight: '500' },
  grupoBotonesLogin: { display: 'flex', flexDirection: 'column', gap: '15px' },
  botonRolInv: { 
    background: '#676FFF', color: 'white', padding: '18px', borderRadius: '16px', border: 'none', 
    fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.2s', textAlign: 'left', display: 'flex', flexDirection: 'column' 
  },
  botonRolEmp: { 
    background: 'white', color: '#1a1a1a', padding: '18px', borderRadius: '16px', border: '2px solid #e5e7eb', 
    fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.2s', textAlign: 'left', display: 'flex', flexDirection: 'column' 
  },
  subTextoBoton: { fontSize: '11px', opacity: 0.8, fontWeight: 'normal', marginTop: '4px' },
  footerLogin: { fontSize: '12px', color: '#9ca3af', marginTop: '30px' },
  
  // Dashboard
  cardApp: { background: 'white', padding: '25px', borderRadius: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px', minHeight: '550px', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  tagRol: { background: '#f3f4f6', padding: '6px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '800', color: '#4b5563', letterSpacing: '1px' },
  botonSalir: { background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
  seccionSaldo: { textAlign: 'center', marginBottom: '30px' },
  badgePol: { display: 'inline-block', color: '#10b981', fontSize: '12px', fontWeight: '600' },
  gridBotones: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '25px' },
  botonAccion: { padding: '12px 5px', borderRadius: '14px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
  infoCard: { background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px dashed #cbd5e1', marginTop: '10px' },
  footerDir: { marginTop: 'auto', textAlign: 'center', padding: '15px 0' }
};

export default function Home() {
  return (
    <PrivyProvider
      appId="cmlohriz801350cl7vrwvdb3i" 
      config={{
        appearance: { 
          theme: 'light', 
          accentColor: '#676FFF', 
          showWalletLoginFirst: false,
          logo: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png' // Un logo temporal profesional
        },
        supportedChains: [polygon],
        embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } },
      }}
    >
      <BilleteraApp />
    </PrivyProvider>
  );
}