'use client';

import { AuthProviders } from '@/components/AuthProviders';
import LoginClient from '@/components/LoginClient';

export default function LoginShell() {
  return (
    <AuthProviders>
      <LoginClient />
    </AuthProviders>
  );
}
