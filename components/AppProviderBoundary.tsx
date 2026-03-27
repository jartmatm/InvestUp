'use client';

import dynamic from 'next/dynamic';

const ProtectedShell = dynamic(
  () => import('@/components/ProtectedShell').then((mod) => mod.ProtectedShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f0fb] px-6 text-center text-sm text-gray-600">
        Loading InvestApp...
      </div>
    ),
  }
);

export function AppProviderBoundary({ children }: { children: React.ReactNode }) {
  return <ProtectedShell>{children}</ProtectedShell>;
}
