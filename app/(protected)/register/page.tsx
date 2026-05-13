'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useInvestApp } from '@/lib/investapp-context';

export default function RegisterPage() {
  const router = useRouter();
  const { login, faseApp } = useInvestApp();

  useEffect(() => {
    if (faseApp === 'dashboard') router.replace('/home');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <main className="min-h-screen bg-transparent px-6 py-10 text-gray-900">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-white/25 bg-white/20 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-md">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mb-6 text-sm text-gray-500">Start investing in minutes.</p>
        <div className="space-y-4">
          <Input placeholder="Email" />
          <Input placeholder="Password" type="password" />
          <Input placeholder="Confirm password" type="password" />
        </div>
        <div className="mt-6">
          <Button onClick={login}>Create account</Button>
        </div>
        <button
          onClick={() => router.push('/login')}
          className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
        >
          I already have an account
        </button>
      </div>
    </main>
  );
}
