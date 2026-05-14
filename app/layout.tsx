import type { Metadata } from 'next';
import { getLocale, getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import './globals.css';
import { AppThemeProvider } from '@/lib/app-theme';
import { defaultLocale, locales, getTextDirection } from '@/i18n/locales';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://investapp.com'),
  title: 'InvestApp',
  description: 'Fintech platform for decentralized investments and repayments',
  alternates: {
    canonical: `/${defaultLocale}`,
    languages: {
      ...Object.fromEntries(locales.map((locale) => [locale, `/${locale}`])),
      'x-default': `/${defaultLocale}`,
    },
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'InvestApp',
    statusBarStyle: 'default',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} dir={getTextDirection(locale)} suppressHydrationWarning>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppThemeProvider>{children}</AppThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
