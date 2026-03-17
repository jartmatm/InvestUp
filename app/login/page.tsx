'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useInvestUp } from '@/lib/investup-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = usePrivy();
  const { faseApp } = useInvestUp();

  useEffect(() => {
    if (faseApp === 'dashboard') router.replace('/home');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <div className="relative flex h-screen w-screen flex-col justify-center overflow-hidden px-8">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/fondo_home.jpg')" }}
      />
      <div className="absolute inset-0 bg-white/68 backdrop-blur-[2px]" />

      <div className="relative mb-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-gray-300 bg-white/70">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-700"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </div>
      </div>

      <h1 className="relative mb-3 text-3xl font-bold leading-tight text-gray-800">
        Register with your <br /> email!
      </h1>

      <p className="relative mb-10 text-gray-600">Sign up effortlessly with just one step!</p>

      <button
        onClick={login}
        className="relative w-full rounded-xl bg-gradient-to-r from-[#6C4CF1] to-[#7A5AF8] py-4 font-semibold text-white shadow-lg transition hover:opacity-90"
      >
        Continue
      </button>
    </div>
  );
}
