'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useModalStatus, usePrivy } from '@privy-io/react-auth';

export default function LoginClient() {
  const router = useRouter();
  const { login, ready, authenticated } = usePrivy();
  const { isOpen } = useModalStatus();
  const hasOpenedLogin = useRef(false);
  const hasSeenLoginModalOpen = useRef(false);

  useEffect(() => {
    if (ready && authenticated) {
      router.replace('/continue');
    }
  }, [authenticated, ready, router]);

  useEffect(() => {
    if (!ready || authenticated || hasOpenedLogin.current) {
      return;
    }

    hasOpenedLogin.current = true;
    login();
  }, [authenticated, login, ready]);

  useEffect(() => {
    if (!ready || authenticated) return;

    if (isOpen) {
      hasSeenLoginModalOpen.current = true;
      return;
    }

    if (hasOpenedLogin.current && hasSeenLoginModalOpen.current) {
      router.replace('/onboarding');
    }
  }, [authenticated, isOpen, ready, router]);

  if (!ready || authenticated) {
    return <div className="min-h-screen bg-transparent" />;
  }

  return (
    <div className="relative flex h-screen w-screen flex-col justify-center overflow-hidden px-8">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/fondo_home.jpg')" }}
      />
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]" />

      <div className="relative rounded-[28px] border border-white/25 bg-white/15 p-8 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-md">
        <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/55 border-t-[#6C4CF1]" />
          <p className="mt-6 text-sm font-medium text-slate-700">Opening secure login...</p>
        </div>
      </div>
    </div>
  );
}
