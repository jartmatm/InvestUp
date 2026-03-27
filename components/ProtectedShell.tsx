'use client';

import { AuthProviders } from '@/components/AuthProviders';
import { AppProviders } from '@/components/AppProviders';

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProviders>
      <AppProviders>{children}</AppProviders>
    </AuthProviders>
  );
}
