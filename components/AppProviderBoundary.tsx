'use client';

import dynamic from 'next/dynamic';
import AppLoadingSkeleton from '@/components/AppLoadingSkeleton';

const ProtectedShell = dynamic(
  () => import('@/components/ProtectedShell').then((mod) => mod.ProtectedShell),
  {
    ssr: false,
    loading: () => <AppLoadingSkeleton />,
  }
);

export function AppProviderBoundary({ children }: { children: React.ReactNode }) {
  return <ProtectedShell>{children}</ProtectedShell>;
}
