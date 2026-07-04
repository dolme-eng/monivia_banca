'use client';

import DashboardShell from '@/components/DashboardShell';
import { SelectedAccountProvider } from '@/lib/selected-account';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SelectedAccountProvider>
      <DashboardShell>{children}</DashboardShell>
    </SelectedAccountProvider>
  );
}
