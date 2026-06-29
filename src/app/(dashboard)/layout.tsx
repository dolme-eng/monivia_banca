'use client';

import { SessionProvider } from 'next-auth/react';
import DashboardShell from '@/components/DashboardShell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <DashboardShell>{children}</DashboardShell>
    </SessionProvider>
  );
}
