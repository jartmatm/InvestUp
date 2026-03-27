'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

export default function LoginClient() {
  const router = useRouter();
  const { login, ready, authenticated } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      router.replace('/home');
    }
  }, [authenticated, ready, router]);

  if (!ready || authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f0fb] px-6 text-center text-sm text-gray-600">
        Loading InvestApp...
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen flex-col justify-center overflow-hidden px-8">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/fondo_home.jpg')" }}
      />
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]" />

      <div className="relative rounded-[28px] border border-white/25 bg-white/20 p-8 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-md">
        <div className="mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-white/30 bg-white/20">
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

        <h1 className="mb-3 text-3xl font-bold leading-tight text-gray-800">
          Register with your <br /> email!
        </h1>

        <p className="mb-10 text-gray-600">Sign up effortlessly with just one step!</p>

        <button
          onClick={login}
          className="w-full rounded-xl bg-gradient-to-r from-[#6C4CF1] to-[#7A5AF8] py-4 font-semibold text-white shadow-lg transition hover:opacity-90"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
