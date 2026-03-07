'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import PageFrame from '@/components/PageFrame';
import { useInvestUp } from '@/lib/investup-context';

export default function WithdrawPage() {
  const router = useRouter();
  const { faseApp, abrirRetiro } = useInvestUp();

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <PageFrame title="Retirar fondos" subtitle="Salida fiat desde USDC">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">Acceso rapido a widget de retiro para tu wallet actual.</p>
        <div className="mt-4">
          <Button onClick={abrirRetiro}>Abrir retiro</Button>
        </div>
      </div>
    </PageFrame>
  );
}
