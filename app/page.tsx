'use client';

import { PrivyProvider, usePrivy, useWallets, useFundWallet } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { polygon } from 'viem/chains';

// --- CONFIGURACIÓN ---
const DATOS_PAISES: any = {
  Colombia: { code: '+57', docs: ['Cédula de Ciudadanía', 'Cédula de Extranjería', 'PPT'] },
  México: { code: '+52', docs: ['INE', 'Pasaporte', 'Cédula Profesional'] },
  España: { code: '+34', docs: ['DNI', 'NIE', 'Pasaporte'] },
  Argentina: { code: '+54', docs: ['DNI', 'Pasaporte'] },
};

const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const USDC_ABI = [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }];
const publicClient = createPublicClient({ chain: polygon, transport: http() });

function BilleteraApp() {
  const privy = usePrivy() as any;
  const { login, logout, authenticated, user } = privy;
  const actualizarUsuario = privy.updateUser || privy.updateMetadata;

  const { wallets } = useWallets();
  const { fundWallet } = useFundWallet();
  const walletEmbebida = wallets.find((w: any) => w.walletClientType === 'privy');

  // Estados Globales
  const [rol, setRol] = useState<string | null>(null);
  const [balanceUSDC, setBalanceUSDC] = useState('0.00');
  const [aceptarTerminos, setAceptarTerminos] = useState(false);
  const [mostrandoForm, setMostrandoForm] = useState(false);
  
  // Estados del Formulario
  const [paso, setPaso] = useState(1);
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', pais: 'Colombia', telefono: '', tipoDoc: 'Cédula de Ciudadanía', numDoc: ''
  });

  // 1. Lógica de Roles y Formulario al iniciar sesión
  useEffect(() => {
    if (authenticated && user) {
      const userRole = user.customMetadata?.role || localStorage.getItem('pending_role');
      
      if (userRole) {
        setRol(userRole);
        // Si es nuevo y no hemos guardado el rol en metadata, lo hacemos
        if (!user.customMetadata?.role && actualizarUsuario) {
          actualizarUsuario({ customMetadata: { ...user.customMetadata, role: userRole } });
          localStorage.removeItem('pending_role');
        }
        // Si no tiene nombre completo, mostrar formulario
        if (!user.customMetadata?.nombre) {
          setMostrandoForm(true);
        }
      }
    }
  }, [authenticated, user, actualizarUsuario]);

  // 2. Cargar Saldo Real
  const cargarSaldo = async () => {
    if (!walletEmbebida?.address) return;
    try {
      const bal = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [walletEmbebida.address],
      });
      setBalanceUSDC(Number(formatUnits(bal as bigint, 6)).toFixed(2));
    } catch (e) { console.error("Error saldo:", e); }
  };

  useEffect(() => {
    if (authenticated && walletEmbebida) cargarSaldo();
  }, [authenticated, walletEmbebida]);

  const iniciarRegistro = (tipo: string) => {
    if (!aceptarTerminos) return;
    localStorage.setItem('pending_role', tipo);
    login();
  };

  const guardarPerfil = async () => {
    if (actualizarUsuario) {
      await actualizarUsuario({
        customMetadata: { ...user?.customMetadata, ...formData }
      });
      setMostrandoForm(false);
    }
  };

  // --- VISTA A: LOGIN ---
  if (!authenticated) {
    return (
      <main style={estilos.contenedor}>
        <div style={estilos.cardLogin}>
          <div style={{fontSize: '50px'}}>🏦</div>
          <h1 style={estilos.tituloLogo}>InvestUp</h1>
          <p style={estilos.claim}>“Invierte mejor que un CDT.<br/>Financia el crecimiento real.”</p>
          
          <div style={estilos.contenedorCheck}>
            <input type="checkbox" id="check" checked={aceptarTerminos} onChange={e => setAceptarTerminos(e.target.checked)} style={estilos.checkbox} />
            <label htmlFor="check" style={estilos.labelCheck}>Acepto los Términos y Condiciones</label>
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <button onClick={() => iniciarRegistro('inversionista')} disabled={!aceptarTerminos} style={{...estilos.botonRolInv, opacity: aceptarTerminos ? 1 : 0.5}}>🚀 Registrarme como Inversionista</button>
            <button onClick={() => iniciarRegistro('emprendedor')} disabled={!aceptarTerminos} style={{...estilos.botonRolEmp, opacity: aceptarTerminos ? 1 : 0.5}}>🏗️ Registrarme como Emprendedor</button>
          </div>
        </div>
      </main>
    );
  }

  // --- VISTA B: FORMULARIO PROGRESIVO ---
  if (mostrandoForm) {
    const progreso = (paso / 3) * 100;
    return (
      <main style={estilos.contenedor}>
        <div style={estilos.cardApp}>
          <div style={estilos.contenedorProgreso}><div style={{...estilos.barraProgreso, width: `${progreso}%`}}></div></div>
          <p style={estilos.textoPasos}>Paso {paso} de 3</p>
          
          <h2 style={{margin: '10px 0'}}>{paso === 1 ? "Tus Datos" : paso === 2 ? "Ubicación" : "Identidad"}</h2>
          
          <div style={estilos.formGrid}>
            {paso === 1 && (
              <>
                <input placeholder="Nombre" style={estilos.input} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                <input placeholder="Apellido" style={estilos.input} onChange={e => setFormData({...formData, apellido: e.target.value})} />
              </>
            )}
            {paso === 2 && (
              <>
                <select style={estilos.input} value={formData.pais} onChange={e => setFormData({...formData, pais: e.target.value, tipoDoc: DATOS_PAISES[e.target.value].docs[0]})}>
                  {Object.keys(DATOS_PAISES).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div style={{display: 'flex', gap: '10px'}}>
                  <div style={estilos.inputPrefijo}>{DATOS_PAISES[formData.pais].code}</div>
                  <input placeholder="Teléfono" style={{...estilos.input, flex: 1}} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                </div>
              </>
            )}
            {paso === 3 && (
              <>
                <select style={estilos.input} value={formData.tipoDoc} onChange={e => setFormData({...formData, tipoDoc: e.target.value})}>
                  {DATOS_PAISES[formData.pais].docs.map((d:string) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input placeholder="Número de Documento" style={estilos.input} onChange={e => setFormData({...formData, numDoc: e.target.value})} />
              </>
            )}
          </div>

          <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
            {paso > 1 && <button onClick={() => setPaso(paso-1)} style={estilos.botonVolver}>Atrás</button>}
            <button onClick={() => paso < 3 ? setPaso(paso+1) : guardarPerfil()} style={estilos.botonSiguiente}>
              {paso < 3 ? "Siguiente" : "Finalizar"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- VISTA C: DASHBOARD ---
  const colorPrincipal = rol === 'inversionista' ? '#676FFF' : '#10b981';

  return (
    <main style={estilos.contenedor}>
      <div style={estilos.cardApp}>
        <div style={estilos.header}>
            <div style={{...estilos.tagRol, color: colorPrincipal}}>{rol?.toUpperCase()}</div>
            <button onClick={logout} style={estilos.botonSalir}>Salir</button>
        </div>
        
        <div style={{marginBottom: '30px'}}>
          <h2 style={{margin: 0}}>Hola, {user.customMetadata?.nombre || 'Inversionista'} 👋</h2>
          <p style={{fontSize: '12px', color: '#666'}}>Bienvenido a tu panel de InvestUp</p>
        </div>

        <div style={estilos.seccionSaldo}>
            <p style={{fontSize: '14px', color: '#666', margin: 0}}>Tu balance</p>
            <h1 style={{fontSize: '48px', margin: '5px 0', color: '#333'}}>${balanceUSDC} <span style={{fontSize: '16px'}}>USDC</span></h1>
            <div style={{color: colorPrincipal, fontSize: '12px', fontWeight: 'bold'}}>● Red Polygon</div>
        </div>

        <div style={estilos.gridBotones}>
            <button onClick={() => fundWallet({ address: walletEmbebida?.address as any })} style={{...estilos.botonAccion, backgroundColor: colorPrincipal, color: 'white'}}>💳 Comprar</button>
            <button style={{...estilos.botonAccion, backgroundColor: '#111', color: 'white'}}>🏦 Retirar</button>
        </div>
      </div>
    </main>
  );
}

// --- ESTILOS ---
const estilos: any = {
  contenedor: { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px' },
  cardLogin: { background: 'white', padding: '40px', borderRadius: '32px', boxShadow: '0 20px 25px rgba(0,0,0,0.1)', textAlign: 'center', width: '100%', maxWidth: '380px' },
  cardApp: { background: 'white', padding: '30px', borderRadius: '32px', boxShadow: '0 10px 15px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px' },
  tituloLogo: { fontSize: '28px', fontWeight: '800', margin: '10px 0' },
  claim: { fontSize: '16px', color: '#4b5563', marginBottom: '25px' },
  contenedorCheck: { display: 'flex', gap: '10px', marginBottom: '20px', textAlign: 'left', alignItems: 'center' },
  checkbox: { width: '18px', height: '18px' },
  labelCheck: { fontSize: '13px', color: '#666' },
  botonRolInv: { background: '#676FFF', color: 'white', padding: '16px', borderRadius: '16px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  botonRolEmp: { background: 'white', color: '#1a1a1a', padding: '16px', borderRadius: '16px', border: '2px solid #e5e7eb', fontWeight: 'bold', cursor: 'pointer' },
  contenedorProgreso: { width: '100%', height: '6px', background: '#eee', borderRadius: '10px', overflow: 'hidden' },
  barraProgreso: { height: '100%', background: '#676FFF', transition: 'width 0.3s' },
  textoPasos: { fontSize: '11px', color: '#999', marginTop: '5px', fontWeight: 'bold' },
  formGrid: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' },
  inputPrefijo: { padding: '14px', background: '#f0f0f0', borderRadius: '12px', border: '1px solid #ddd', fontSize: '14px' },
  botonSiguiente: { flex: 2, background: '#111', color: 'white', padding: '15px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  botonVolver: { flex: 1, background: '#eee', padding: '15px', borderRadius: '12px', border: 'none', cursor: 'pointer' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  tagRol: { background: '#f3f4f6', padding: '6px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '800' },
  botonSalir: { background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' },
  seccionSaldo: { textAlign: 'center', marginBottom: '30px', background: '#fcfcfc', padding: '20px', borderRadius: '20px' },
  gridBotones: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  botonAccion: { padding: '15px', borderRadius: '15px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }
};

export default function Home() {
  return (
    <PrivyProvider appId="cmlohriz801350cl7vrwvdb3i" config={{ appearance: { theme: 'light', accentColor: '#676FFF' }, supportedChains: [polygon], embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } } }}>
      <BilleteraApp />
    </PrivyProvider>
  );
}