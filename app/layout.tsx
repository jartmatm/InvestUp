import type { Metadata } from 'next';
import './globals.css';
import { AppThemeProvider } from '@/lib/app-theme';

export const metadata: Metadata = {
  title: 'InvestApp',
  description: 'Plataforma fintech para inversiones y repayments descentralizados',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
