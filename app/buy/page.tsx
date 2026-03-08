'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import PageFrame from '@/components/PageFrame';
import { useInvestUp } from '@/lib/investup-context';

export default function BuyPage() {
  const router = useRouter();
  const { faseApp, abrirCompra } = useInvestUp();

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <PageFrame title="Comprar USDC" subtitle="Conecta rampa fiat">
      <div className="rounded-3xl border border-white/35 bg-white/90 p-4 shadow-xl shadow-violet-800/10">
        <p className="text-sm text-slate-600">
          Integra aqui tu widget (Moonpay o proveedor equivalente). Por ahora usamos el flujo de fund wallet de Privy.
        </p>
        <div className="mt-4">
          <Button onClick={abrirCompra}>Abrir compra</Button>
        </div>
      </div>
    </PageFrame>
  );
}
