'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import { useInvestUp } from '@/lib/investup-context';

export default function OnboardingPage() {
  const router = useRouter();
  const { faseApp, guardarRol, rolSeleccionado } = useInvestUp();
  const [rol, setRol] = useState<'inversor' | 'emprendedor' | null>(rolSeleccionado);
  const [acceptsTerms, setAcceptsTerms] = useState(false);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'dashboard') router.replace('/home');
  }, [faseApp, router]);

  return (
    <main className="min-h-screen bg-transparent px-5 py-8 text-gray-900">
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-white/25 bg-white/20 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-md">
        <h1 className="text-2xl font-semibold tracking-tight">Basic information</h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose your profile. You can change it later.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => setRol('inversor')}
            className={`rounded-lg border p-4 text-left transition ${rol === 'inversor' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
          >
            <p className="text-sm font-semibold">Investor</p>
            <p className={`text-xs ${rol === 'inversor' ? 'text-primary/80' : 'text-gray-500'}`}>
              Invest in ventures
            </p>
          </button>
          <button
            onClick={() => setRol('emprendedor')}
            className={`rounded-lg border p-4 text-left transition ${rol === 'emprendedor' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
          >
            <p className="text-sm font-semibold">Entrepreneur</p>
            <p className={`text-xs ${rol === 'emprendedor' ? 'text-primary/80' : 'text-gray-500'}`}>
              Send payments to investors
            </p>
          </button>
        </div>

        <label className="mt-5 flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={acceptsTerms}
            onChange={(event) => setAcceptsTerms(event.target.checked)}
          />
          I accept the terms and conditions
        </label>

        <div className="mt-6">
          <Button
            disabled={!rol || !acceptsTerms}
            onClick={async () => {
              if (!rol) return;
              await guardarRol(rol);
            }}
          >
            Continue
          </Button>
        </div>
      </section>
    </main>
  );
}
