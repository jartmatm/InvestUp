'use client';

import dynamic from 'next/dynamic';

const ProtectedShell = dynamic(
  () => import('@/components/ProtectedShell').then((mod) => mod.ProtectedShell),
  {
    ssr: false,
    loading: () => <div className="min-h-screen bg-transparent" />,
  }
);

export function AppProviderBoundary({ children }: { children: React.ReactNode }) {
  return <ProtectedShell>{children}</ProtectedShell>;
}
