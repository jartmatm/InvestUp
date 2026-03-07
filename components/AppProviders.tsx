'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { SmartWalletsProvider } from '@privy-io/react-auth/smart-wallets';
import { polygon } from 'viem/chains';
import { InvestUpProvider } from '@/lib/investup-context';

const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';

export function AppProviders({ children }: { children: React.ReactNode }) {
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
        loginMethods: ['email'],
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
      }}
    >
      <SmartWalletsProvider config={{ paymasterContext: { token: USDC_ADDRESS } }}>
        <InvestUpProvider>{children}</InvestUpProvider>
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}
