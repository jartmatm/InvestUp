'use client';

import { PrivyProvider, usePrivy, useWallets, useFundWallet } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { polygon } from 'viem/chains';

// --- CONFIGURACIÓN DE PAÍSES ---
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

  // Estados
  const [rol, setRol] = useState<string | null>(null);
  const [balanceUSDC, setBalanceUSDC] = useState('0.00');
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [paso, setPaso] = useState(1); // Manejo de la barra de progreso

  const [formData, setFormData] = useState({
    nombre: '', apellido: '', pais: 'Colombia', telefono: '', tipoDoc: 'Cédula de Ciudadanía', numDoc: ''
  });

  useEffect(() => {
    if (authenticated && user) {
      if (user.customMetadata?.role) {
        setRol(user.customMetadata.role);
        if (!user.customMetadata?.nombre) setMostrandoForm(true);
      }
    }
  }, [authenticated, user]);

  const finalizarRegistro = async () => {
    if (!actualizarUsuario) return;
    try {
      await actualizarUsuario({
        customMetadata: { ...user?.customMetadata, ...formData, completado: 'true' }
      });
      setMostrandoForm(false);
    } catch (e) { alert("Error guardando datos"); }
  };

  // --- UI FORMULARIO CON PASOS ---
  if (authenticated && mostrandoForm) {
    const progreso = (paso / 3) * 100;

    return (
      <main style={estilos.contenedor}>
        <div style={estilos.cardApp}>
          {/* BARRA DE PROGRESO */}
          <div style={estilos.contenedorProgreso}>
            <div style={{ ...estilos.barraProgreso, width: `${progreso}%` }}></div>
          </div>
          <p style={estilos.textoPasos}>Paso {paso} de 3</p>

          <h2 style={{ margin: '10px 0 5px 0' }}>
            {paso === 1 && "Cuéntanos de ti"}
            {paso === 2 && "¿Dónde te encuentras?"}
            {paso === 3 && "Verifica tu identidad"}
          </h2>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '25px' }}>
            {paso === 1 && "Introduce tu nombre legal para InvestUp."}
            {paso === 2 && "Esto nos ayuda a ajustar las tasas a tu moneda local."}
            {paso === 3 && "Tus datos están encriptados y seguros."}
          </p>

          <div style={estilos.formGrid}>
            {paso === 1 && (
              <>
                <input placeholder="Nombre(s)" style={estilos.input} value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                <input placeholder="Apellidos" style={estilos.input} value={formData.apellido} onChange={e => setFormData({ ...formData, apellido: e.target.value })} />
              </>
            )}

            {paso === 2 && (
              <>
                <select style={estilos.input} value={formData.pais} onChange={e => {
                  const p = e.target.value;
                  setFormData({ ...formData, pais: p, tipoDoc: DATOS_PAISES[p].docs[0] });
                }}>
                  {Object.keys(DATOS_PAISES).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <div style={estilos.inputPrefijo}>{DATOS_PAISES[formData.pais].code}</div>
                  <input placeholder="Teléfono" style={{ ...estilos.input, flex: 1 }} value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} />
                </div>
              </>
            )}

            {paso === 3 && (
              <>
                <select style={estilos.input} value={formData.tipoDoc} onChange={e => setFormData({ ...formData, tipoDoc: e.target.value })}>
                  {DATOS_PAISES[formData.pais].docs.map((d: string) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input placeholder="Número de Documento" style={estilos.input} value={formData.numDoc} onChange={e => setFormData({ ...formData, numDoc: e.target.value })} />
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
            {paso > 1 && (
              <button onClick={() => setPaso(paso - 1)} style={estilos.botonVolver}>Atrás</button>
            )}
            
            {paso < 3 ? (
              <button 
                onClick={() => setPaso(paso + 1)} 
                disabled={paso === 1 && !formData.nombre}
                style={{ ...estilos.botonSiguiente, opacity: (paso === 1 && !formData.nombre) ? 0.5 : 1 }}
              >
                Siguiente
              </button>
            ) : (
              <button onClick={finalizarRegistro} style={{ ...estilos.botonSiguiente, backgroundColor: '#111' }}>
                Finalizar
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  // --- LOGIN & DASHBOARD (Simplificados para esta vista) ---
  if (!authenticated) {
    return (
        <main style={estilos.contenedor}>
          <div style={estilos.cardLogin}>
            <div style={{fontSize: '50px'}}>🏦</div>
            <h1 style={estilos.tituloLogo}>InvestUp</h1>
            <p style={estilos.claim}>“Invierte mejor que un CDT.”</p>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <button onClick={() => { localStorage.setItem('pending_role', 'inversionista'); login(); }} style={estilos.botonRolInv}>🚀 Inversionista</button>
                <button onClick={() => { localStorage.setItem('pending_role', 'emprendedor'); login(); }} style={estilos.botonRolEmp}>🏗️ Emprendedor</button>
            </div>
          </div>
        </main>
      );
  }

  return (
    <main style={estilos.contenedor}>
      <div style={estilos.cardApp}>
        <div style={estilos.header}>
            <div style={estilos.tagRol}>{rol?.toUpperCase()}</div>
            <button onClick={logout} style={estilos.botonSalir}>Salir</button>
        </div>
        <h3>Hola, {user.customMetadata?.nombre} 👋</h3>
        <div style={estilos.seccionSaldo}>
            <h1 style={{fontSize: '42px', margin: '5px 0'}}>${balanceUSDC} <span style={{fontSize: '16px'}}>USDC</span></h1>
        </div>
        <div style={estilos.gridBotones}>
            <button onClick={() => fundWallet({ address: walletEmbebida?.address as any })} style={{...estilos.botonAccion, background: '#676FFF', color: 'white'}}>💳 Comprar</button>
            <button style={estilos.botonAccion}>🏦 Retirar</button>
        </div>
      </div>
    </main>
  );
}

// --- ESTILOS ---
const estilos: any = {
  contenedor: { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px' },
  cardApp: { background: 'white', padding: '30px', borderRadius: '32px', boxShadow: '0 10px 15px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px', position: 'relative' },
  cardLogin: { background: 'white', padding: '40px', borderRadius: '32px', boxShadow: '0 20px 25px rgba(0,0,0,0.1)', textAlign: 'center', width: '100%', maxWidth: '380px' },
  
  // Barra de progreso
  contenedorProgreso: { width: '100%', height: '6px', background: '#e5e7eb', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px' },
  barraProgreso: { height: '100%', background: '#676FFF', transition: 'width 0.3s ease' },
  textoPasos: { fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' },

  formGrid: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '15px', borderRadius: '16px', border: '1px solid #e5e7eb', fontSize: '15px', outline: 'none', background: '#f9fafb' },
  inputPrefijo: { padding: '15px', background: '#f3f4f6', borderRadius: '16px', border: '1px solid #e5e7eb', fontSize: '15px', color: '#666' },
  
  botonSiguiente: { flex: 2, background: '#676FFF', color: 'white', padding: '16px', borderRadius: '16px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  botonVolver: { flex: 1, background: '#f3f4f6', color: '#4b5563', padding: '16px', borderRadius: '16px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  
  tituloLogo: { fontSize: '28px', fontWeight: '800', margin: '10px 0' },
  claim: { fontSize: '16px', color: '#4b5563', marginBottom: '25px' },
  botonRolInv: { background: '#676FFF', color: 'white', padding: '18px', borderRadius: '16px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  botonRolEmp: { background: 'white', color: '#1a1a1a', padding: '18px', borderRadius: '16px', border: '2px solid #e5e7eb', fontWeight: 'bold', cursor: 'pointer' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  tagRol: { background: '#f3f4f6', padding: '6px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '800' },
  botonSalir: { background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' },
  seccionSaldo: { textAlign: 'center', marginBottom: '30px' },
  gridBotones: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  botonAccion: { padding: '12px 5px', borderRadius: '14px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', background: '#f1f5f9' },
};

export default function Home() {
  return (
    <PrivyProvider appId="cmlohriz801350cl7vrwvdb3i" config={{ appearance: { theme: 'light', accentColor: '#676FFF' }, supportedChains: [polygon], embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } } }}>
      <BilleteraApp />
    </PrivyProvider>
  );
}