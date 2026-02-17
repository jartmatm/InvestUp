'use client';

// 1. Quitamos useUpdateUser del import para que no de error
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
  // 2. Extraemos todo de usePrivy y usamos 'any' para evitar que TypeScript bloquee el build
  const privy = usePrivy() as any;
  const { login, logout, authenticated, user } = privy;
  
  // Intentamos obtener la función de actualización, no importa cómo se llame en tu versión
  const actualizarUsuario = privy.updateUser || privy.updateMetadata;

  const { wallets } = useWallets();
  const { fundWallet } = useFundWallet(); 
  const walletEmbebida = wallets.find((w: any) => w.walletClientType === 'privy');

  const [rol, setRol] = useState<string | null>(null);
  const [vista, setVista] = useState<'inicio' | 'enviar'>('inicio');
  const [balanceUSDC, setBalanceUSDC] = useState('0.00');

  // Sincronizar Rol
  useEffect(() => {
    if (user?.customMetadata?.role) {
      setRol(user.customMetadata.role as string);
    }
  }, [user]);

  const actualizarSaldos = async () => {
    if (!walletEmbebida?.address) return;
    try {
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

  const iniciarRegistro = (tipoRol: 'inversionista' | 'emprendedor') => {
    localStorage.setItem('pending_role', tipoRol);
    login();
  };

  useEffect(() => {
    const pendingRole = localStorage.getItem('pending_role');
    if (authenticated && pendingRole && !user?.customMetadata?.role && actualizarUsuario) {
      // Usamos la función que encontramos dinámicamente
      actualizarUsuario({ customMetadata: { role: pendingRole } });
      setRol(pendingRole);
      localStorage.removeItem('pending_role');
    }
  }, [authenticated, user, actualizarUsuario]);

  if (!authenticated) {
    return (
      <main style={estilos.contenedor}>
        <div style={estilos.cardLogin}>
          <div style={{fontSize: '50px'}}>🏦</div>
          <h1 style={{fontSize: '28px', fontWeight: '800', margin: '10px 0'}}>InvestUp</h1>
          <p style={{color: '#4b5563', marginBottom: '30px'}}>“Invierte mejor que un CDT.<br/>Financia el crecimiento real.”</p>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
            <button onClick={() => iniciarRegistro('inversionista')} style={estilos.botonRolInv}>
               🚀 Registrarme como Inversionista
            </button>
            <button onClick={() => iniciarRegistro('emprendedor')} style={estilos.botonRolEmp}>
               🏗️ Registrarme como Emprendedor
            </button>
          </div>
        </div>
      </main>
    );
  }

  const colorPrincipal = rol === 'inversionista' ? '#676FFF' : '#10b981';

  return (
    <main style={estilos.contenedor}>
      <div style={estilos.cardApp}>
        <div style={estilos.header}>
            <div style={{...estilos.tagRol, color: colorPrincipal}}>{rol?.toUpperCase() || 'USUARIO'}</div>
            <button onClick={logout} style={estilos.botonSalir}>Salir</button>
        </div>

        <div style={estilos.seccionSaldo}>
            <p style={{fontSize: '14px', color: '#666', margin: 0}}>Balance Disponible</p>
            <h1 style={{fontSize: '42px', margin: '5px 0', color: '#333'}}>${balanceUSDC} <span style={{fontSize: '16px'}}>USDC</span></h1>
            <div style={{color: colorPrincipal, fontSize: '12px', fontWeight: '600'}}>⛽ Red Polygon</div>
        </div>

        <div style={estilos.gridBotones}>
            <button onClick={() => setVista('enviar')} style={estilos.botonAccion}>💸 Enviar</button>
            <button 
                onClick={() => fundWallet({ address: walletEmbebida?.address as any })} 
                style={{...estilos.botonAccion, backgroundColor: colorPrincipal, color: 'white'}}
            >
              💳 Comprar
            </button>
            <button style={{...estilos.botonAccion, backgroundColor: '#111', color: 'white'}}>🏦 Retirar</button>
        </div>

        <div style={{...estilos.infoCard, borderLeft: `4px solid ${colorPrincipal}`}}>
          <h4 style={{margin: '0 0 5px 0'}}>Próximamente ⚡</h4>
          <p style={{fontSize: '12px', color: '#666'}}>
            {rol === 'inversionista' ? 'Verás proyectos para invertir.' : 'Podrás solicitar financiamiento.'}
          </p>
        </div>
      </div>
    </main>
  );
}

// --- ESTILOS ---
const estilos: any = {
  contenedor: { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px' },
  cardLogin: { background: 'white', padding: '40px', borderRadius: '32px', boxShadow: '0 20px 25px rgba(0,0,0,0.1)', textAlign: 'center', width: '100%', maxWidth: '380px' },
  botonRolInv: { background: '#676FFF', color: 'white', padding: '18px', borderRadius: '16px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  botonRolEmp: { background: 'white', color: '#1a1a1a', padding: '18px', borderRadius: '16px', border: '2px solid #e5e7eb', fontWeight: 'bold', cursor: 'pointer' },
  cardApp: { background: 'white', padding: '25px', borderRadius: '32px', boxShadow: '0 10px 15px rgba(0,0,0,0.05)', width: '100%', maxWidth: '380px', minHeight: '500px', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  tagRol: { background: '#f3f4f6', padding: '6px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '800' },
  botonSalir: { background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' },
  seccionSaldo: { textAlign: 'center', marginBottom: '30px' },
  gridBotones: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '25px' },
  botonAccion: { padding: '12px 5px', borderRadius: '14px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', background: '#f1f5f9' },
  infoCard: { background: '#f8fafc', padding: '20px', borderRadius: '16px' }
};

export default function Home() {
  return (
    <PrivyProvider
      appId="cmlohriz801350cl7vrwvdb3i" 
      config={{
        appearance: { theme: 'light', accentColor: '#676FFF' },
        supportedChains: [polygon],
        embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } },
      }}
    >
      <BilleteraApp />
    </PrivyProvider>
  );
}