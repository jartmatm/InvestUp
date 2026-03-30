'use client';

import dynamic from 'next/dynamic';

const LoginShell = dynamic(() => import('@/components/LoginShell'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-transparent" />,
});

export default function LoginPageBoundary() {
  return <LoginShell />;
}
