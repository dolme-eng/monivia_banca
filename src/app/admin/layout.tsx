import type { Metadata } from 'next';
import '../globals.css';
import AdminDashboardShell from '@/components/AdminDashboardShell';

export const metadata: Metadata = {
  title: 'Monivia Banca | Amministrazione',
};

export default function AdminLayout({
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
      <body className="bg-slate-50 text-slate-900 antialiased">
        <AdminDashboardShell>{children}</AdminDashboardShell>
      </body>
    </html>
  );
}
