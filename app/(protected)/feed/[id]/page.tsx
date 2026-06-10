'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { SectionLoadingSkeleton } from '@/components/AppLoadingSkeleton';
import { useInvestApp } from '@/lib/investapp-context';

export default function FeedDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { faseApp, rolSeleccionado } = useInvestApp();
  const { ready } = usePrivy();
  const projectId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  useEffect(() => {
    if (faseApp === 'login') {
      router.replace('/login');
      return;
    }

    if (faseApp === 'onboarding') {
      router.replace('/onboarding');
      return;
    }

    if (!ready || !projectId || !rolSeleccionado) return;

    const nextRoute =
      rolSeleccionado === 'inversor'
        ? `/feed/${projectId}/invest`
        : `/feed/${projectId}/invest?mode=close`;

    router.replace(nextRoute);
  }, [faseApp, projectId, ready, rolSeleccionado, router]);

  return (
    <main className="min-h-screen bg-[#F8FAFE] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <SectionLoadingSkeleton rows={4} />
      </div>
    </main>
  );
}
