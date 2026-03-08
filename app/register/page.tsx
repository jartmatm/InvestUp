'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useInvestUp } from '@/lib/investup-context';

export default function RegisterPage() {
  const router = useRouter();
  const { login, faseApp } = useInvestUp();

  useEffect(() => {
    if (faseApp === 'dashboard') router.replace('/home');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-700 via-violet-600 to-teal-400 px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/35 bg-white/18 p-6 shadow-2xl shadow-violet-800/20 backdrop-blur-xl">
        <h1 className="mb-1 text-3xl font-bold tracking-tight">Crear cuenta</h1>
        <p className="mb-6 text-sm text-white/85">Empeza a invertir en minutos.</p>
        <div className="space-y-4">
          <Input placeholder="Correo electronico" />
          <Input placeholder="Contrasena" type="password" />
          <Input placeholder="Confirmar contrasena" type="password" />
        </div>
        <div className="mt-6">
          <Button onClick={login}>Crear cuenta</Button>
        </div>
        <button
          onClick={() => router.push('/login')}
          className="mt-4 w-full rounded-full border border-white/50 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Ya tengo cuenta
        </button>
      </div>
    </main>
  );
}
