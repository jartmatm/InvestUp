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
    smartWalletAddress,
    actualizarSaldos,
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
      rightSlot={
        <button
          onClick={logoutApp}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
        >
          Salir
        </button>
      }
    >
      <BalanceCard balanceUSDC={balanceUSDC} />
      <ActionButtons
        role={rolSeleccionado}
        onInvest={() => router.push('/invest')}
        onBuy={() => router.push('/buy')}
        onWithdraw={() => router.push('/withdraw')}
      />
      <div className="mt-4">
        <Button onClick={actualizarSaldos}>Actualizar saldo</Button>
      </div>
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 text-center text-xs text-gray-600 shadow-sm">
        <p className="font-semibold text-primary">Wallet activa</p>
        <code className="mt-1 block break-all text-[11px] text-gray-700">
          {smartWalletAddress ?? 'Generando direccion...'}
        </code>
        <p className="mt-1 text-[11px] text-gray-500">
          Modulo activo: {rolSeleccionado === 'emprendedor' ? 'Repayments' : 'Inversiones'}
        </p>
      </section>
    </PageFrame>
  );
}
