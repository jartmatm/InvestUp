import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvestApp",
  description: "Plataforma fintech para inversiones y repayments descentralizados",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
