'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useInvestUp } from '@/lib/investup-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, faseApp } = useInvestUp();

  useEffect(() => {
    if (faseApp === 'dashboard') router.replace('/home');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-600 via-violet-500 to-teal-400 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col items-center justify-between">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-8 rounded-3xl bg-white p-8 shadow-2xl shadow-violet-700/30">
            <svg
              viewBox="0 0 24 24"
              className="h-16 w-16 text-violet-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 17 9 11 13 15 21 7" />
              <polyline points="14 7 21 7 21 14" />
            </svg>
          </div>

          <h1 className="text-5xl font-bold tracking-tight">InvestUp</h1>
          <p className="mt-3 text-lg text-white/90">Uniendo emprendedores con Inversionistas</p>
        </div>

        <div className="w-full space-y-4">
          <button
            onClick={login}
            className="w-full rounded-full bg-white px-6 py-4 text-lg font-semibold text-violet-600 shadow-xl shadow-violet-700/25 transition hover:bg-white/90"
          >
            Iniciar sesion
          </button>

          <button
            onClick={() => router.push('/register')}
            className="w-full rounded-full border-2 border-white bg-transparent px-6 py-4 text-lg font-semibold text-white transition hover:bg-white/10"
          >
            Registrarse
          </button>

          <p className="pt-3 text-center text-sm text-white/90">
            Powered by <span className="font-semibold">Privy</span>
          </p>
        </div>
      </div>
    </main>
  );
}
