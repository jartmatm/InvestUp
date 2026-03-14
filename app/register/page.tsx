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
    <main className="min-h-screen bg-gray-100 px-6 py-10 text-gray-900">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Crear cuenta</h1>
        <p className="mb-6 text-sm text-gray-500">Empeza a invertir en minutos.</p>
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
          className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
        >
          Ya tengo cuenta
        </button>
      </div>
    </main>
  );
}
