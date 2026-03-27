import { AppProviderBoundary } from '@/components/AppProviderBoundary';

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppProviderBoundary>{children}</AppProviderBoundary>;
}
