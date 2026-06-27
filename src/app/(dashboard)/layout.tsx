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
      <DashboardShell>{children}</DashboardShell>
    </SessionProvider>
  );
}
