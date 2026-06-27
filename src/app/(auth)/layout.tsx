import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Monivia Banca | Accesso Sicuro',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <head>
        <meta name="msapplication-TileColor" content="#0f172a" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className="bg-white text-slate-900 antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
