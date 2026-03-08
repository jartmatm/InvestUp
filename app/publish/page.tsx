'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PageFrame from '@/components/PageFrame';
import { useInvestUp } from '@/lib/investup-context';

export default function PublishPage() {
  const router = useRouter();
  const { faseApp } = useInvestUp();

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <PageFrame title="Publicar emprendimiento" subtitle="Crea una nueva oportunidad">
      <div className="space-y-4 rounded-3xl border border-white/35 bg-white/90 p-4 shadow-xl shadow-violet-800/10">
        <Input placeholder="Nombre del proyecto" />
        <Input placeholder="Descripcion" />
        <Input placeholder="Meta de inversion" />
        <Button>Publicar</Button>
      </div>
    </PageFrame>
  );
}
