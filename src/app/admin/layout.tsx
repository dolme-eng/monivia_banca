'use client';

import { SessionProvider } from 'next-auth/react';
import AdminDashboardShell from '@/components/AdminDashboardShell';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <AdminDashboardShell>{children}</AdminDashboardShell>
    </SessionProvider>
  );
}
