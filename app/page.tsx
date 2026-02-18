'use client';

import { useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import { PrivyProvider, usePrivy, useWallets, useFundWallet } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { createPublicClient, http, formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { polygonAmoy } from 'viem/chains';

// --- CONFIGURACIÓN CONSTANTE ---
const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const USDC_ABI = [
  { name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'transfer', type: 'function', inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }
];

const publicClient = createPublicClient({ 
  chain: polygonAmoy, 
  transport: http() 
});

function BilleteraApp() {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets(); // Este nos da todas las wallets conectadas
  const { fundWallet } = useFundWallet(); 
  
 // 1. Buscamos la wallet de tipo 'smart_wallet' (la de ZeroDev)
  const smartWallet = wallets.find((w) => w.walletClientType === 'smart_wallet');
  
  // 2. Obtenemos el cliente para operar
  const { client: smartWalletClient } = useSmartWallets();

  // --- DEBUG LOGS ACTUALIZADOS ---
  console.log("--- DIAGNÓSTICO ZERODEV ---");
  console.log("¿Existe Smart Wallet en la lista?:", !!smartWallet);
  console.log("Dirección Smart Wallet:", smartWallet?.address);
  console.log("Cliente Smart Listo:", !!smartWalletClient);

  // --- 3. ESTADOS ---
  const [rol, setRol] = useState<string | null>(null);
  const [aceptarTerminos, setAceptarTerminos] = useState(false);
  const [vista, setVista] = useState<'inicio' | 'enviar'>('inicio');
  const [balanceUSDC, setBalanceUSDC] = useState('0.00');
  const [historial, setHistorial] = useState<string[]>([]);
  const [destino, setDestino] = useState('');
  const [monto, setMonto] = useState('');
  const [loading, setLoading] = useState(false);

  const privy = usePrivy() as any; 
  const actualizarUsuario = privy.updateUser || privy.updateMetadata;

  // --- 4. LÓGICA DE ROL Y REGISTRO ---
  useEffect(() => {
    if (authenticated && user) {
      const storedRole = user.customMetadata?.role;
      const pendingRole = localStorage.getItem('pending_role');

      if (storedRole) {
        setRol(storedRole as string);
      } else if (pendingRole && actualizarUsuario) {
        actualizarUsuario({ customMetadata: { role: pendingRole } });
        setRol(pendingRole);
        localStorage.removeItem('pending_role');
      }
    }
  }, [authenticated, user, actualizarUsuario]);

  const iniciarRegistro = (tipoRol: string) => {
    if (!aceptarTerminos) return; 
    localStorage.setItem('pending_role', tipoRol);
    login();
  };

  // --- 5. ACTUALIZAR SALDO ---
  const actualizarSaldos = async () => {
    const direccionAUsar = smartWalletClient?.account?.address || smartWallet?.address;
    if (!direccionAUsar) return;

    try {
      const balUsdc = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [direccionAUsar as `0x${string}`],
      });
      setBalanceUSDC(Number(formatUnits(balUsdc as bigint, 6)).toFixed(2));
    } catch (e) {
      console.error("Error leyendo saldos:", e);
    }
  };

  useEffect(() => {
    if (authenticated && (smartWalletClient || smartWallet)) {
      actualizarSaldos();
    }
  }, [authenticated, smartWalletClient, smartWallet]);

  // --- 6. ENVIAR USD ---
  const enviarUSD = async () => {
    const clienteActivo = smartWalletClient;
    
    if (!clienteActivo) {
      console.log("Smart Wallet no lista.");
      return alert("La billetera inteligente se está inicializando. Por favor, cierra sesión y vuelve a entrar.");
    }

    if (!destino || !monto) return alert("Faltan datos de envío");
    
    setLoading(true);
    try {
      const montoWei = parseUnits(monto, 6);
      const data = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [destino as `0x${string}`, montoWei],
      });

      const txHash = await clienteActivo.sendTransaction({
        account: clienteActivo.account,
        to: USDC_ADDRESS as `0x${string}`,
        data: data,
      });

      setHistorial([`Envío de ${monto} USD a ${destino.slice(0,6)}...`, ...historial]);
      alert(`✅ ¡Enviado con éxito!`);
      setVista('inicio');
      setTimeout(actualizarSaldos, 3000);
    } catch (e: any) {
      console.error("Error en transferencia:", e);
      alert("Error: " + (e.shortMessage || e.message || "La transacción fue rechazada"));
    } finally {
      setLoading(false);
    }
  };

  // --- 7. RETIRO CON MOONPAY ---
  const abrirRetiro = () => {
    const direccionAUsar = smartWalletClient?.account?.address || smartWallet?.address;
    if (!direccionAUsar) return alert("Conecta tu wallet primero");

    const apiKey = 'pk_test_123'; 
    const moonpayUrl = `https://sell.moonpay.com/?apiKey=${apiKey}&baseCurrencyCode=usdc_polygon&walletAddress=${direccionAUsar}`;

    window.open(moonpayUrl, 'MoonPaySell', 'width=450,height=700');
  };

  // --- 8. INTERFAZ DE USUARIO ---
  if (!authenticated) {
    return (
      <main style={estilos.contenedor}>
        <div style={estilos.cardLogin}>
          <div style={{fontSize: '40px', marginBottom: '10px'}}>🏦</div>
          <h1 style={{color: '#333', margin: '0 0 10px 0'}}>InvestUp</h1>
          <div style={estilos.contenedorCheck}>
             <input type="checkbox" id="terminos" checked={aceptarTerminos} onChange={(e) => setAceptarTerminos(e.target.checked)} />
             <label htmlFor="terminos" style={{fontSize: '12px', color: '#555'}}>Acepto términos y condiciones</label>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <button onClick={() => iniciarRegistro('inversionista')} disabled={!aceptarTerminos} style={{...estilos.botonRol, background: '#676FFF', color: 'white'}}>🚀 Soy Inversionista</button>
            <button onClick={() => iniciarRegistro('emprendedor')} disabled={!aceptarTerminos} style={{...estilos.botonRol, background: 'white', border: '1px solid #ddd'}}>🏗️ Soy Emprendedor</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={estilos.contenedor}>
      <div style={estilos.cardApp}>
        <div style={estilos.header}>
            <div style={{display: 'flex', flexDirection: 'column'}}>
                <span style={{fontSize: '14px', fontWeight: 'bold'}}>{user?.email?.address?.split('@')[0]}</span>
                <span style={{fontSize: '10px', background: rol === 'inversionista' ? '#eef2ff' : '#ecfdf5', color: rol === 'inversionista' ? '#676FFF' : '#10b981', padding: '2px 8px', borderRadius: '10px', marginTop: '4px', fontWeight: '800'}}>
                    {rol ? rol.toUpperCase() : 'USUARIO'}
                </span>
            </div>
            <button onClick={logout} style={estilos.botonSalir}>Salir</button>
        </div>

        {vista === 'inicio' ? (
          <>
            <div style={estilos.seccionSaldo}>
                <p style={{fontSize: '14px', color: '#666'}}>Balance Disponible</p>
                <h1 style={{fontSize: '42px', margin: '5px 0'}}>${balanceUSDC} <span style={{fontSize: '16px'}}>USD</span></h1>
            </div>

            <div style={{...estilos.gridBotones, gridTemplateColumns: '1fr 1fr 1fr'}}>
                <button onClick={() => setVista('enviar')} style={estilos.botonAccion}>💸 Enviar</button>
                <button 
                    onClick={() => fundWallet({ address: (smartWalletClient?.account?.address || smartWallet?.address) as any })} 
                    style={{...estilos.botonAccion, backgroundColor: '#676FFF', color: 'white'}}
                >
                    💳 Comprar
                </button>
                <button onClick={abrirRetiro} style={{...estilos.botonAccion, backgroundColor: '#FF6767', color: 'white'}}>
                    🏦 Retirar
                </button>
            </div>

            <div style={estilos.listaHistorial}>
                <h4 style={{color: '#555'}}>Actividad</h4>
                {historial.map((item, i) => <div key={i} style={estilos.itemHistorial}>{item}</div>)}
            </div>

            <div style={estilos.footerDir}>
                <p style={{fontSize: '9px', color: '#999'}}>ID de cuenta USD:</p>
                <code style={{fontSize: '9px'}}>{smartWallet?.address || 'Generando cuenta...'}</code>
            </div>
          </>
        ) : (
          <div style={estilos.formEnvio}>
            <h2>Enviar USD</h2>
            <input placeholder="0x..." value={destino} onChange={(e) => setDestino(e.target.value)} style={estilos.input} />
            <input type="number" placeholder="0.00" value={monto} onChange={(e) => setMonto(e.target.value)} style={estilos.inputMonto} />
            <div style={estilos.cajaResumen}>
                <div style={estilos.filaResumen}><span>Tarifa:</span><span>0.05 USD</span></div>
            </div>
            <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                <button onClick={() => setVista('inicio')} style={estilos.botonCancelar}>Atrás</button>
                <button onClick={enviarUSD} disabled={loading} style={estilos.botonConfirmar}>{loading ? 'Procesando...' : 'Confirmar'}</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// --- ESTILOS MEJORADOS ---
const estilos: any = {
  contenedor: { minHeight: '100vh', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' },
  cardLogin: { background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', width: '320px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },
  cardApp: { background: 'white', padding: '25px', borderRadius: '24px', width: '350px', minHeight: '550px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '30px' },
  seccionSaldo: { textAlign: 'center', marginBottom: '30px' },
  gridBotones: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  botonAccion: { padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: '#f0f0f0' },
  botonSalir: { background: '#fff0f0', color: '#ff4d4d', border: 'none', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
  footerDir: { marginTop: 'auto', background: '#f9f9f9', padding: '10px', borderRadius: '12px', textAlign: 'center' },
  input: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #eee', marginBottom: '10px', boxSizing: 'border-box' },
  inputMonto: { width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #eee', fontSize: '24px', textAlign: 'center', boxSizing: 'border-box' },
  cajaResumen: { background: '#f8fafc', padding: '15px', borderRadius: '12px', marginTop: '15px' },
  filaResumen: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' },
  botonConfirmar: { flex: 2, padding: '15px', background: '#676FFF', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold' },
  botonCancelar: { flex: 1, padding: '15px', background: '#eee', border: 'none', borderRadius: '12px', fontWeight: 'bold' },
  botonRol: { padding: '15px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  contenedorCheck: { display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center', justifyContent: 'center' },
  itemHistorial: { padding: '10px 0', borderBottom: '1px solid #f9f9f9', fontSize: '12px' }
};

export default function Home() {
  return (
    <PrivyProvider
      appId="cmlohriz801350cl7vrwvdb3i"
      config={{
        // 1. Red de pruebas Amoy configurada
        supportedChains: [polygonAmoy], 
        appearance: { 
          theme: 'light', 
          accentColor: '#676FFF' 
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          // Forzamos la activación de Smart Wallets con el "as any"
          ...({
            smartWallets: {
              createOnLogin: 'all-users',
            },
          } as any),
        },
      }}
    >
      <BilleteraApp />
    </PrivyProvider>
  ); // <-- Aquí faltaba el cierre del return
} // <-- Y aquí el de la función