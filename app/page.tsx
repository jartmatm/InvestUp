'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useInvestUp } from '@/lib/investup-context';

export default function SplashPage() {
  const router = useRouter();
  const { faseApp } = useInvestUp();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (faseApp === 'dashboard') {
        router.replace('/home');
        return;
      }
      if (faseApp === 'onboarding') {
        router.replace('/onboarding');
        return;
      }
      router.replace('/login');
    }, 1700);

    return () => clearTimeout(timeout);
  }, [faseApp, router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-teal-400 px-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.22),transparent_40%),radial-gradient(circle_at_84%_12%,rgba(255,255,255,0.14),transparent_40%)]" />

      <section className="relative mx-auto w-full max-w-sm rounded-3xl border border-white/35 bg-white/12 p-8 text-center shadow-2xl shadow-violet-900/25 backdrop-blur-xl">
        <div className="mx-auto mb-5 flex h-24 w-24 animate-pulse items-center justify-center rounded-3xl bg-white shadow-xl">
          <img src="/favicon.ico" alt="InvestUp" className="h-14 w-14 rounded-xl" />
        </div>

        <h1 className="text-4xl font-bold tracking-tight">InvestUp</h1>
        <p className="mt-2 text-sm text-white/85">Cargando plataforma...</p>

        <div className="mt-6 rounded-2xl border border-dashed border-white/50 px-4 py-5 text-xs text-white/80">
          Espacio listo para insertar tu GIF animado
        </div>
      </section>
    </main>
  );
}
