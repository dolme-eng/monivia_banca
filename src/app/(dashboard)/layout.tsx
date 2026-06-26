'use client';

import { SessionProvider } from 'next-auth/react';
import '../globals.css';
import DashboardShell from '@/components/DashboardShell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <html lang="it">
        <head>
          <meta name="msapplication-TileColor" content="#0f172a" />
          <meta name="theme-color" content="#0f172a" />
        </head>
        <body className="bg-slate-50 text-slate-900 antialiased">
          <DashboardShell>{children}</DashboardShell>
        </body>
      </html>
    </SessionProvider>
  );
}
