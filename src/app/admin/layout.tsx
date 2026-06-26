'use client';

import { SessionProvider } from 'next-auth/react';
import '../globals.css';
import AdminDashboardShell from '@/components/AdminDashboardShell';

export default function AdminLayout({
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
          <title>Monivia Banca | Amministrazione</title>
        </head>
        <body className="bg-slate-50 text-slate-900 antialiased">
          <AdminDashboardShell>{children}</AdminDashboardShell>
        </body>
      </html>
    </SessionProvider>
  );
}
