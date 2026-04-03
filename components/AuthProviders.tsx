'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { polygon } from 'viem/chains';

export function AuthProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId="cmlohriz801350cl7vrwvdb3i"
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#5B4BFF',
          showWalletLoginFirst: false,
        },
        supportedChains: [polygon],
        loginMethods: ['email', 'passkey', 'google', 'twitter'],
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
