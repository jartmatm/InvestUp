'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import InvestmentCard from '@/components/InvestmentCard';
import PageFrame from '@/components/PageFrame';
import { useInvestUp } from '@/lib/investup-context';

export default function PortfolioPage() {
  const router = useRouter();
  const { faseApp, historial, rolSeleccionado } = useInvestUp();

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <PageFrame
      title={rolSeleccionado === 'emprendedor' ? 'Mis repayments' : 'Mis inversiones'}
      subtitle="Resumen de tus operaciones"
    >
      <div className="space-y-3">
        {historial.length === 0 ? (
          <InvestmentCard title="Sin movimientos" detail="Las operaciones apareceran aqui." />
        ) : (
          historial.map((item, index) => (
            <InvestmentCard key={`${item}-${index}`} title={`Operacion ${index + 1}`} detail={item} />
          ))
        )}
      </div>
    </PageFrame>
  );
}
