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
    <main className="min-h-screen bg-gray-100 px-5 py-8 text-gray-900">
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Informacion basica</h1>
        <p className="mt-1 text-sm text-gray-500">
          Selecciona tu perfil *Puedes cambiarlo mas adelante
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => setRol('inversor')}
            className={`rounded-lg border p-4 text-left transition ${rol === 'inversor' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
          >
            <p className="text-sm font-semibold">Inversor</p>
            <p className={`text-xs ${rol === 'inversor' ? 'text-primary/80' : 'text-gray-500'}`}>
              Invertir en Emprendimientos
            </p>
          </button>
          <button
            onClick={() => setRol('emprendedor')}
            className={`rounded-lg border p-4 text-left transition ${rol === 'emprendedor' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
          >
            <p className="text-sm font-semibold">Emprendedor</p>
            <p className={`text-xs ${rol === 'emprendedor' ? 'text-primary/80' : 'text-gray-500'}`}>
              Enviar pagos a Inversionistas
            </p>
          </button>
        </div>

        <label className="mt-5 flex items-center gap-2 text-sm text-gray-600">
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
            }}
          >
            Continuar
          </Button>
        </div>
      </section>
    </main>
  );
}
