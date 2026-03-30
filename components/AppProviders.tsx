'use client';

import { useEffect, useState } from 'react';

type AppBundle = {
  InvestAppProvider: React.ComponentType<{ children: React.ReactNode }>;
  SmartWalletsProvider: React.ComponentType<{
    config: Record<string, unknown>;
    children: React.ReactNode;
  }>;
  TransactionOverlay: React.ComponentType;
  TransactionReceipt: React.ComponentType;
};

const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [bundle, setBundle] = useState<AppBundle | null>(null);

  useEffect(() => {
    let active = true;

    const loadBundle = async () => {
      const [smartWalletsModule, investAppModule, overlayModule, receiptModule] = await Promise.all([
        import('@privy-io/react-auth/smart-wallets'),
        import('@/lib/investapp-context'),
        import('@/components/TransactionOverlay'),
        import('@/components/TransactionReceipt'),
      ]);

      if (!active) return;

      setBundle({
        InvestAppProvider: investAppModule.InvestAppProvider,
        SmartWalletsProvider: smartWalletsModule.SmartWalletsProvider,
        TransactionOverlay: overlayModule.default,
        TransactionReceipt: receiptModule.default,
      });
    };

    void loadBundle();

    return () => {
      active = false;
    };
  }, []);

  if (!bundle) {
    return <div className="min-h-screen bg-transparent" />;
  }

  const { InvestAppProvider, SmartWalletsProvider, TransactionOverlay, TransactionReceipt } = bundle;

  return (
    <SmartWalletsProvider config={{ paymasterContext: { token: USDC_ADDRESS } }}>
      <InvestAppProvider>
        {children}
        <TransactionOverlay />
        <TransactionReceipt />
      </InvestAppProvider>
    </SmartWalletsProvider>
  );
}
