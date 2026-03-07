'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import { useInvestUp } from '@/lib/investup-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, faseApp } = useInvestUp();

  useEffect(() => {
    if (faseApp === 'dashboard') router.replace('/home');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-center text-3xl font-bold">InvestUp</h1>
        <p className="mb-6 text-center text-sm text-slate-500">Inversion descentralizada</p>
        <Button onClick={login}>Iniciar sesion</Button>
        <button
          onClick={() => router.push('/register')}
          className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
        >
          Registrarse
        </button>
      </div>
    </main>
  );
}
