'use client';

import dynamic from 'next/dynamic';

const LoginShell = dynamic(() => import('@/components/LoginShell'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f0fb] px-6 text-center text-sm text-gray-600">
      Loading InvestApp...
    </div>
  ),
});

export default function LoginPageBoundary() {
  return <LoginShell />;
}
