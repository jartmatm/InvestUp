'use client';

import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { createPublicClient, http, formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { polygon } from 'viem/chains';

// --- CONFIGURACIÓN ---
const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const USDC_ABI = [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }, { name: 'transfer', type: 'function', inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }];

// Cliente para LEER la blockchain (sin necesidad de wallet conectada)
const publicClient = createPublicClient({ chain: polygon, transport: http() });

function BilleteraApp() {
  // Integramos fundWallet aquí para el On-Ramp
  const { login, logout, authenticated, user, fundWallet } = usePrivy();
  const { wallets } = useWallets();
  const walletEmbebida = wallets.find((w) => w.walletClientType === 'privy');

  // Estados de la App
  const [vista, setVista] = useState<'inicio' | 'enviar'>('inicio');
  const [balanceUSDC, setBalanceUSDC] = useState('0.00');
  const [balancePOL, setBalancePOL] = useState('0.00');
  const [historial, setHistorial] = useState<string[]>([]);
  
  // Estados del Formulario de Envío
  const [destino, setDestino] = useState('');
  const [monto, setMonto] = useState('');
  const [loading, setLoading] = useState(false);

  // --- 1. LÓGICA PARA LEER SALDOS ---
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
    } catch (e) {
      console.error("Error leyendo saldos:", e);
    }
  };

  useEffect(() => {
    if (authenticated && walletEmbebida) {
      actualizarSaldos();
    }
  }, [authenticated, walletEmbebida]);

  // --- 2. LÓGICA PARA ENVIAR DINERO ---
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

  // --- 3. DISEÑO DE LA INTERFAZ ---
  if (!authenticated) {
    return (
      <main style={estilos.contenedor}>
        <div style={estilos.cardLogin}>
          <h1 style={{color: '#676FFF', marginBottom: '10px'}}>InvestUp 🏦</h1>
          <p style={{color: '#666', marginBottom: '30px'}}>Primera Versión de InvestUp.</p>
          <button onClick={login} style={estilos.botonPrimario}>🔑 Entrar con Email</button>
        </div>
      </main>
    );
  }

  return (
    <main style={estilos.contenedor}>
      <div style={estilos.cardApp}>
        <div style={estilos.header}>
            <div style={{fontSize: '12px', color: '#888'}}>Hola, {user?.email?.address?.split('@')[0]}</div>
            <button onClick={logout} style={estilos.botonSalir}>Salir</button>
        </div>

        {vista === 'inicio' ? (
          <>
            <div style={estilos.seccionSaldo}>
                <p style={{fontSize: '14px', color: '#666', margin: 0}}>Balance Total</p>
                <h1 style={{fontSize: '42px', margin: '5px 0', color: '#333'}}>${balanceUSDC} <span style={{fontSize: '16px'}}>USDC</span></h1>
                <div style={estilos.badgePol}>⛽ Gas: {balancePOL} POL</div>
            </div>

            {/* BOTONES PRINCIPALES */}
            <div style={estilos.gridBotones}>
                <button onClick={() => setVista('enviar')} style={estilos.botonAccion}>💸 Enviar</button>
                
                {/* Botón de Compra conectado a Moonpay/Ramp */}
                <button 
                  onClick={() => fundWallet(walletEmbebida?.address || '')} 
                  style={{...estilos.botonAccion, backgroundColor: '#676FFF', color: 'white'}}
                >
                  💳 Comprar
                </button>
            </div>

            {/* Botón de Recargar secundario */}
            <button onClick={actualizarSaldos} style={{...estilos.botonAccionSecundario, marginTop: '15px', width: '100%'}}>
               🔄 Actualizar Saldo
            </button>

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
               <p style={{fontSize: '10px', margin: 0}}>Tu dirección:</p> 
               <code style={{fontSize: '10px', color: '#676FFF'}}>{walletEmbebida?.address}</code>
            </div>
          </>
        ) : (
          <div style={estilos.formEnvio}>
            <h2 style={{color: '#333'}}>Enviar Dinero</h2>
            <p style={{fontSize: '12px', color: '#666', marginBottom: '20px'}}>Estás en la red Polygon</p>
            
            <input 
              placeholder="Dirección 0x del destino..." 
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              style={estilos.input}
            />
            <div style={{position: 'relative', width: '100%'}}>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  style={estilos.inputMonto}
                />
                <span style={{position: 'absolute', right: '15px', top: '15px', fontWeight: 'bold', color: '#888'}}>USDC</span>
            </div>

            <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                <button onClick={() => setVista('inicio')} style={estilos.botonCancelar}>Cancelar</button>
                <button onClick={enviarUSDC} disabled={loading} style={estilos.botonConfirmar}>
                    {loading ? 'Enviando...' : 'Confirmar Envío'}
                </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const estilos: any = {
  contenedor: { minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" },
  cardLogin: { background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', textAlign: 'center', width: '90%', maxWidth: '350px' },
  cardApp: { background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', width: '90%', maxWidth: '380px', minHeight: '500px', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  botonPrimario: { width: '100%', padding: '15px', background: '#676FFF', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  botonSalir: { background: '#fff0f0', color: '#ff4d4d', border: 'none', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' },
  seccionSaldo: { textAlign: 'center', padding: '20px 0', borderBottom: '1px solid #f0f0f0' },
  badgePol: { display: 'inline-block', background: '#eef2ff', color: '#676FFF', padding: '5px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold' },
  gridBotones: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '25px' },
  botonAccion: { background: '#111', color: 'white', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
  botonAccionSecundario: { background: 'white', color: '#111', border: '1px solid #ddd', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' },
  listaHistorial: { marginTop: '25px', flex: 1 },
  itemHistorial: { padding: '10px', borderBottom: '1px solid #eee', fontSize: '12px', color: '#444' },
  footerDir: { marginTop: 'auto', textAlign: 'center', background: '#f9f9f9', padding: '10px', borderRadius: '12px' },
  formEnvio: { display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' },
  input: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '15px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  inputMonto: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '24px', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box' },
  botonCancelar: { flex: 1, padding: '15px', background: '#f0f0f0', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' },
  botonConfirmar: { flex: 1, padding: '15px', background: '#676FFF', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' },
};

export default function Home() {
  return (
    <PrivyProvider
      appId="cmlohriz801350cl7vrwvdb3i" 
      config={{
        appearance: { 
          theme: 'light', 
          accentColor: '#676FFF', 
          showWalletLoginFirst: false 
        },
        embeddedWallets: { 
          ethereum: {
            createOnLogin: 'users-without-wallets' 
          }
        },
      }}
    >
      <BilleteraApp />
    </PrivyProvider>
  );
}