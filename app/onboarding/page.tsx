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
    <main className="min-h-screen bg-gradient-to-br from-violet-700 via-violet-600 to-teal-400 px-5 py-8 text-white">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-white/35 bg-white/18 p-6 shadow-2xl shadow-violet-800/20 backdrop-blur-xl">
        <h1 className="text-3xl font-bold tracking-tight">Informacion basica</h1>
        <p className="mt-1 text-sm text-white/85">Selecciona tu perfil para habilitar funciones.</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => setRol('inversor')}
            className={`rounded-2xl border p-4 text-left transition ${rol === 'inversor' ? 'border-white bg-white text-violet-700 shadow-lg' : 'border-white/45 bg-white/10 text-white hover:bg-white/18'}`}
          >
            <p className="text-sm font-semibold">Inversor</p>
            <p className={`text-xs ${rol === 'inversor' ? 'text-violet-600/80' : 'text-white/75'}`}>
              Invertir en wallets de emprendedores
            </p>
          </button>
          <button
            onClick={() => setRol('emprendedor')}
            className={`rounded-2xl border p-4 text-left transition ${rol === 'emprendedor' ? 'border-white bg-white text-violet-700 shadow-lg' : 'border-white/45 bg-white/10 text-white hover:bg-white/18'}`}
          >
            <p className="text-sm font-semibold">Emprendedor</p>
            <p className={`text-xs ${rol === 'emprendedor' ? 'text-violet-600/80' : 'text-white/75'}`}>
              Enviar repayments a inversionistas
            </p>
          </button>
        </div>

        <label className="mt-5 flex items-center gap-2 text-sm text-white/90">
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
