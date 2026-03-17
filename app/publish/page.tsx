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
      <div className="space-y-4 rounded-xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
        <Input placeholder="Nombre del proyecto" />
        <Input placeholder="Descripcion" />
        <Input placeholder="Meta de inversion" />
        <Button>Publicar</Button>
      </div>
    </PageFrame>
  );
}

