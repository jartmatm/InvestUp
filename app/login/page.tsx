'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useInvestUp } from '@/lib/investup-context';
import Button from '@/components/Button';

export default function LoginPage() {
  const router = useRouter();
  const { login, faseApp } = useInvestUp();

  useEffect(() => {
    if (faseApp === 'dashboard') router.replace('/home');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10 text-gray-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col items-center justify-between">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-8 rounded-2xl bg-primary/10 p-8 shadow-sm">
            <svg
              viewBox="0 0 24 24"
              className="h-16 w-16 text-primary"
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

          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">InvestUp</h1>
          <p className="mt-3 text-sm text-gray-600">Uniendo emprendedores con Inversionistas</p>
        </div>

        <div className="w-full space-y-4">
          <Button onClick={login} className="w-full py-3 text-base">
            Entrar
          </Button>

          <p className="pt-3 text-center text-sm text-gray-500">
            Powered by <span className="font-semibold">Privy</span>
          </p>
        </div>
      </div>
    </main>
  );
}
