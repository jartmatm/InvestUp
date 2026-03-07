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
        <button className="w-full rounded-xl bg-white p-4 text-left text-sm font-medium shadow-sm">
          Historial de transacciones
        </button>
        <button className="w-full rounded-xl bg-white p-4 text-left text-sm font-medium shadow-sm">
          Seguridad
        </button>
        <button className="w-full rounded-xl bg-white p-4 text-left text-sm font-medium shadow-sm">
          Soporte
        </button>
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 text-xs text-slate-600 shadow-sm">
        <p>
          Rol actual: <span className="font-semibold">{rolSeleccionado ?? 'sin rol'}</span>
        </p>
        <p className="mt-2 break-all">
          Wallet: <code>{smartWalletAddress ?? 'cargando...'}</code>
        </p>
      </div>

      <button
        onClick={logoutApp}
        className="mt-4 w-full rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-600"
      >
        Cerrar sesion
      </button>
    </PageFrame>
  );
}
