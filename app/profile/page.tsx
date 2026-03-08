'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageFrame from '@/components/PageFrame';
import { useInvestUp } from '@/lib/investup-context';

export default function ProfilePage() {
  const router = useRouter();
  const { faseApp, rolSeleccionado, smartWalletAddress, logoutApp } = useInvestUp();

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <PageFrame title="Perfil" subtitle="Configuracion de cuenta">
      <div className="space-y-3">
        <button className="w-full rounded-3xl border border-white/35 bg-white/90 p-4 text-left text-sm font-medium text-slate-800 shadow-xl shadow-violet-800/10">
          Historial de transacciones
        </button>
        <button className="w-full rounded-3xl border border-white/35 bg-white/90 p-4 text-left text-sm font-medium text-slate-800 shadow-xl shadow-violet-800/10">
          Seguridad
        </button>
        <button className="w-full rounded-3xl border border-white/35 bg-white/90 p-4 text-left text-sm font-medium text-slate-800 shadow-xl shadow-violet-800/10">
          Soporte
        </button>
      </div>

      <div className="mt-4 rounded-3xl border border-white/35 bg-white/90 p-4 text-xs text-slate-600 shadow-xl shadow-violet-800/10">
        <p>
          Rol actual: <span className="font-semibold">{rolSeleccionado ?? 'sin rol'}</span>
        </p>
        <p className="mt-2 break-all">
          Wallet: <code>{smartWalletAddress ?? 'cargando...'}</code>
        </p>
      </div>

      <button
        onClick={logoutApp}
        className="mt-4 w-full rounded-full border border-white/45 bg-white/10 p-3 text-sm font-semibold text-white transition hover:bg-white/18"
      >
        Cerrar sesion
      </button>
    </PageFrame>
  );
}
