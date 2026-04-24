'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useModalStatus, usePrivy } from '@privy-io/react-auth';
import PrivyLoginBackground from '@/components/PrivyLoginBackground';

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
    <div className="relative flex h-screen w-screen flex-col justify-center overflow-hidden px-6">
      <PrivyLoginBackground />

      <div className="relative mx-auto w-full max-w-sm rounded-[28px] border border-white/12 bg-white/[0.06] p-8 shadow-[0_18px_44px_rgba(2,6,23,0.36)] backdrop-blur-xl">
        <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/18 border-t-[#6C4DFF]" />
          <p className="mt-6 text-sm font-medium text-slate-100/88">Opening secure login...</p>
        </div>
      </div>
    </div>
  );
}
