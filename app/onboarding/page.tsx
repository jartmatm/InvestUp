'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import { useInvestUp } from '@/lib/investup-context';

export default function OnboardingPage() {
  const router = useRouter();
  const { faseApp, guardarRol, rolSeleccionado } = useInvestUp();
  const [rol, setRol] = useState<'inversor' | 'emprendedor' | null>(rolSeleccionado);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'dashboard') router.replace('/home');
  }, [faseApp, router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-5 py-8">
      <section className="w-full rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold">Informacion basica</h1>
        <p className="mt-1 text-sm text-slate-500">Selecciona tu perfil para habilitar funciones.</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => setRol('inversor')}
            className={`rounded-xl border p-4 text-left ${rol === 'inversor' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}
          >
            <p className="text-sm font-semibold">Inversor</p>
            <p className="text-xs text-slate-500">Invertir en wallets de emprendedores</p>
          </button>
          <button
            onClick={() => setRol('emprendedor')}
            className={`rounded-xl border p-4 text-left ${rol === 'emprendedor' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}
          >
            <p className="text-sm font-semibold">Emprendedor</p>
            <p className="text-xs text-slate-500">Enviar repayments a inversionistas</p>
          </button>
        </div>

        <label className="mt-5 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={aceptaTerminos}
            onChange={(event) => setAceptaTerminos(event.target.checked)}
          />
          Acepto terminos y condiciones
        </label>

        <div className="mt-6">
          <Button
            disabled={!rol || !aceptaTerminos}
            onClick={async () => {
              if (!rol) return;
              await guardarRol(rol);
              router.push('/home');
            }}
          >
            Continuar
          </Button>
        </div>
      </section>
    </main>
  );
}
