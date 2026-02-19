'use client';

import { PrivyProvider, usePrivy, useWallets, useFundWallet } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { createPublicClient, http, formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { polygon } from 'viem/chains';

// --- CONFIGURACIÓN ---
const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';

const USDC_ABI = [
  { name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'transfer', type: 'function', inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }], outputs: [{ type: 'bool' }] }
];

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(),
});

function BilleteraApp() {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { fundWallet } = useFundWallet();

  const walletEmbebida = wallets.find((w) => w.walletClientType === 'privy');

  // --- ESTADOS ---
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
  const completarOnboarding = () => {
  if (!rolSeleccionado) return;

  localStorage.setItem("rol", rolSeleccionado);
  setFaseApp("dashboard");
};


  // --- CONTROL FLUJO ---
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

  // --- ACTUALIZAR SALDOS ---
  const actualizarSaldos = async () => {
    if (!walletEmbebida?.address) return;

    try {
      const balPol = await publicClient.getBalance({
        address: walletEmbebida.address as `0x${string}`,
      });
      setBalancePOL(Number(formatUnits(balPol, 18)).toFixed(4));

      const balUsdc = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [walletEmbebida.address as `0x${string}`],
      });

      setBalanceUSDC(Number(formatUnits(balUsdc as bigint, 6)).toFixed(2));
    } catch (e) {
      console.error('Error leyendo saldos:', e);
    }
  };

  useEffect(() => {
    if (faseApp === 'dashboard' && walletEmbebida?.address) {
      actualizarSaldos();
      const interval = setInterval(actualizarSaldos, 15000);
      return () => clearInterval(interval);
    }
  }, [faseApp, walletEmbebida?.address]);

  // --- VALIDACIÓN SIMPLE DIRECCIÓN ---
  const esDireccionValida = (dir: string) => /^0x[a-fA-F0-9]{40}$/.test(dir);

  // --- ENVIAR USDC ---
  const enviarUSDC = async () => {
    if (loading) return;

    if (!walletEmbebida || !destino || !monto) {
      alert('Faltan datos');
      return;
    }

    if (!esDireccionValida(destino)) {
      alert('Dirección inválida');
      return;
    }

    if (Number(monto) <= 0) {
      alert('Monto inválido');
      return;
    }

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
        params: [
          {
            from: walletEmbebida.address,
            to: USDC_ADDRESS,
            data,
          },
        ],
      });

      setHistorial((prev) => [
        `Envío de ${monto} USDC a ${destino.slice(0, 6)}...`,
        ...prev,
      ]);

      alert(`✅ ¡Enviado! Hash: ${txHash}`);
      setDestino('');
      setMonto('');
      setVista('inicio');

      setTimeout(actualizarSaldos, 3000);
    } catch (e: any) {
      alert('❌ Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const abrirRetiro = () => {
    if (!walletEmbebida?.address) return alert('Conecta tu wallet primero');
    const moonpayUrl = `https://sell.moonpay.com/?apiKey=pk_test_123&baseCurrencyCode=usdc_polygon&walletAddress=${walletEmbebida.address}`;
    window.open(moonpayUrl, 'MoonPaySell', 'width=450,height=700');
  };

  // --- RENDER ---
  if (faseApp === 'login' || faseApp === 'loading') {
    return (
      <main style={estilos.contenedor}>
        <div style={estilos.cardLogin}>
          <h1 style={{ color: '#676FFF' }}>InvestUp 🏦</h1>
          <button onClick={login} style={estilos.botonPrimario}>
            🔑 Entrar / Registrarse
          </button>
        </div>
      </main>
    );
  }

  if (faseApp === 'onboarding') {
    return (
      <main style={estilos.contenedor}>
        <div style={estilos.cardApp}>
          <h2>Bienvenido a InvestUp</h2>

          <div style={estilos.gridRoles}>
            <div onClick={() => setRolSeleccionado('inversor')} style={estilos.cardRol}>
              📈 Soy Inversor
            </div>
            <div onClick={() => setRolSeleccionado('emprendedor')} style={estilos.cardRol}>
              🚀 Soy Emprendedor
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <input
              type="checkbox"
              checked={aceptaTerminos}
              onChange={(e) => setAceptaTerminos(e.target.checked)}
            />
            Acepto términos y condiciones
          </div>

          <button
            disabled={!rolSeleccionado || !aceptaTerminos}
            onClick={completarOnboarding}
            style={estilos.botonPrimario}
          >
            Continuar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={estilos.contenedor}>
      <div style={estilos.cardApp}>
        <div style={estilos.header}>
          <div>
            Hola, {user?.email?.address?.split('@')[0]}
          </div>
          <button
            onClick={() => {
              logout();
              localStorage.removeItem(`investup_rol_${user?.id}`);
            }}
          >
            Salir
          </button>
        </div>

        {vista === 'inicio' ? (
          <>
            <h1>${balanceUSDC} USDC</h1>
            <div>Gas: {balancePOL} POL</div>

            <button onClick={() => setVista('enviar')}>Enviar</button>
            <button onClick={() => fundWallet({ address: walletEmbebida?.address as any })}>
              Comprar
            </button>
            <button onClick={abrirRetiro}>Retirar</button>

            <button onClick={actualizarSaldos}>Actualizar</button>

            <div>
              <h4>Actividad Reciente</h4>
              {historial.length === 0
                ? 'No hay movimientos'
                : historial.map((item, i) => <div key={i}>{item}</div>)}
            </div>
          </>
        ) : (
          <>
            <input
              placeholder="Dirección 0x..."
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
            />
            <input
              type="number"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
            <button onClick={() => setVista('inicio')}>Cancelar</button>
            <button disabled={loading} onClick={enviarUSDC}>
              {loading ? 'Enviando...' : 'Confirmar'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

const estilos: any = {
  contenedor: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardLogin: { background: 'white', padding: '40px', borderRadius: '20px' },
  cardApp: { background: 'white', padding: '30px', borderRadius: '20px', width: '380px' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  botonPrimario: { padding: '15px', background: '#676FFF', color: 'white', borderRadius: '10px', border: 'none', marginTop: '15px' },
  gridRoles: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  cardRol: { padding: '20px', background: '#f5f5f5', borderRadius: '15px', cursor: 'pointer', textAlign: 'center' },
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
