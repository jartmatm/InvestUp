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
      title="Bienvenido"
      subtitle={`${userAlias} - ${rolSeleccionado}`}
     /* rightSlot={
        <button
          onClick={logoutApp}
          className="rounded-full border border-white/45 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/18"
        >
          Salir
        </button>
      }*/
    >
      <BalanceCard balanceUSDC={balanceUSDC} balancePOL={balancePOL} />
      <ActionButtons
        role={rolSeleccionado}
        onInvest={() => router.push('/invest')}
        onBuy={() => router.push('/buy')}
        onWithdraw={() => router.push('/withdraw')}
      />
      <div className="mt-4">
        <Button onClick={actualizarSaldos}>Actualizar saldo</Button>
      </div>
      <section className="mt-6 rounded-3xl border border-white/35 bg-white/88 p-4 text-xs text-slate-600 shadow-xl shadow-violet-800/10">
        <p className="font-semibold text-violet-700">Wallet activa</p>
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
