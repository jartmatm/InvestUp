'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ActionButtons from '@/components/ActionButtons';
import BalanceCard from '@/components/BalanceCard';
import Button from '@/components/Button';
import PageFrame from '@/components/PageFrame';
import { useInvestUp } from '@/lib/investup-context';

export default function HomePage() {
  const router = useRouter();
  const {
    faseApp,
    rolSeleccionado,
    userAlias,
    balanceUSDC,
    balancePOL,
    smartWalletAddress,
    actualizarSaldos,
    abrirCompra,
    abrirRetiro,
    logoutApp,
  } = useInvestUp();

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <PageFrame
      title="Inicio"
      subtitle={`Hola ${userAlias}`}
      rightSlot={
        <button
          onClick={logoutApp}
          className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600"
        >
          Salir
        </button>
      }
    >
      <BalanceCard balanceUSDC={balanceUSDC} balancePOL={balancePOL} />
      <ActionButtons
        role={rolSeleccionado}
        onInvest={() => router.push('/invest')}
        onBuy={() => router.push('/buy')}
        onWithdraw={() => router.push('/withdraw')}
      />
      <div className="mt-4">
        <Button onClick={actualizarSaldos}>Refrescar saldo</Button>
      </div>
      <section className="mt-6 rounded-xl border border-slate-100 bg-white p-4 text-xs text-slate-600 shadow-sm">
        <p className="font-semibold text-indigo-600">Wallet activa</p>
        <code className="block break-all text-[11px] text-slate-700">
          {smartWalletAddress ?? 'Generando direccion...'}
        </code>
        <p className="mt-1 text-[11px] text-slate-500">
          Modulo activo: {rolSeleccionado === 'emprendedor' ? 'Repayments' : 'Inversiones'}
        </p>
      </section>
    </PageFrame>
  );
}
