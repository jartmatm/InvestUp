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
    <main className="mx-auto min-h-screen w-full max-w-xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">Crear Cuenta</h1>
      <div className="space-y-4">
        <Input placeholder="Correo electronico" />
        <Input placeholder="Contrasena" type="password" />
        <Input placeholder="Confirmar contrasena" type="password" />
      </div>
      <div className="mt-6">
        <Button onClick={login}>Crear cuenta</Button>
      </div>
      <button onClick={() => router.push('/login')} className="mt-4 text-sm text-indigo-600">
        Ya tengo cuenta
      </button>
    </main>
  );
}
