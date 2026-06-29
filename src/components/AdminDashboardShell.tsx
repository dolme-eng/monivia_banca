'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMySession } from '@/lib/use-my-session';

import {
  LayoutDashboard,
  UserPlus,
  CheckCircle2,
  Search,
  Bell,
  HelpCircle,
  Plus,
  Menu,
  X,
  Clock,
  LogOut,
  Users,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Panoramica', icon: LayoutDashboard },
  { href: '/admin/accounts', label: 'Conti', icon: Users },
  { href: '/admin/timeline', label: 'Timeline', icon: Clock },
  { href: '/admin/provision', label: 'Provisioning', icon: UserPlus },
  { href: '/admin/approvals', label: 'Approvazioni', icon: CheckCircle2 },
];

export default function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useMySession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingAccountsCount, setPendingAccountsCount] = useState(0);

  const adminName = session?.user?.name || 'Admin';
  const initials = adminName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch('/api/admin/transactions?status=PENDING');
        const data = await res.json();
        if (data.transactions) {
          setPendingCount(data.transactions.length);
        } else if (Array.isArray(data)) {
          setPendingCount(data.length);
        }
      } catch {}
    };
    const fetchPendingAccounts = async () => {
      try {
        const res = await fetch('/api/admin/accounts?status=PENDING');
        const data = await res.json();
        setPendingAccountsCount(data.accounts?.length ?? 0);
      } catch {}
    };
    fetchPending();
    fetchPendingAccounts();
    const interval = setInterval(() => {
      fetchPending();
      fetchPendingAccounts();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.replace('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* ===== Sidebar (desktop) ===== */}
      <aside className="hidden md:flex flex-col h-screen w-64 bg-primary p-4 gap-3 shadow-md fixed left-0 top-0 z-40">
        <div className="mb-6 px-3">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
              <span className="text-sm font-black text-primary">A</span>
            </div>
            <div>
              <span className="flex items-center gap-1 leading-tight">
                <span className="text-lg font-black tracking-tight text-white">
                  MO<span className="text-secondary">NIVIA</span>
                </span>
                <span className="relative -top-2.5 text-[11px] font-black uppercase tracking-[0.25em] text-white/40">
                  Banca
                </span>
              </span>
              <span className="text-[11px] text-white/40 uppercase tracking-[0.18em] block mt-0.5">Amministrazione</span>
            </div>
          </Link>
        </div>

        <nav className="flex flex-col gap-1 flex-grow">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-black transition-all ${
                  active
                    ? 'bg-secondary text-primary'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label}
                {href === '/admin/approvals' && pendingCount > 0 && (
                  <span className="ml-auto bg-amber-500 text-primary text-[11px] font-black px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
                {href === '/admin/accounts' && pendingAccountsCount > 0 && (
                  <span className="ml-auto bg-amber-500 text-primary text-[11px] font-black px-1.5 py-0.5 rounded-full">
                    {pendingAccountsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/admin/provision"
          className="mt-auto w-full py-3 bg-secondary text-primary font-black rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-cyan-300 transition-colors"
        >
          <Plus size={16} />
          Nuovo Provisioning
        </Link>

        <button
          onClick={handleSignOut}
          className="w-full py-2.5 text-white/40 hover:text-white text-xs font-black flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut size={14} />
          Esci
        </button>
      </aside>

      {/* ===== Mobile sidebar overlay ===== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-primary p-4 gap-3 flex flex-col shadow-xl">
            <div className="flex items-center justify-between mb-6 px-1">
              <span className="flex items-center gap-1">
                <span className="text-xl font-black tracking-tight text-white">
                  MO<span className="text-secondary">NIVIA</span>
                </span>
                <span className="relative -top-2.5 text-[11px] font-black uppercase tracking-[0.25em] text-white/40">
                  Banca
                </span>
              </span>
              <button onClick={() => setMobileOpen(false)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/60 hover:text-white rounded-lg">
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 flex-grow">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-black transition-all ${
                      active
                        ? 'bg-secondary text-primary'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                    {href === '/admin/approvals' && pendingCount > 0 && (
                      <span className="ml-auto bg-amber-500 text-primary text-[11px] font-black px-1.5 py-0.5 rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={() => { setMobileOpen(false); handleSignOut(); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-black text-white/40 hover:bg-white/10 hover:text-white transition-all"
            >
              <LogOut size={18} />
              Esci
            </button>
          </aside>
        </div>
      )}

      {/* ===== Main area ===== */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200/70 h-16 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-primary rounded-lg"
              onClick={() => setMobileOpen(true)}
              aria-label="Apri menu"
            >
              <Menu size={20} />
            </button>
            <div className="relative hidden sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca..."
                disabled
                readOnly
                className="pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-secondary/30 opacity-60 cursor-not-allowed"
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/admin/approvals" className="relative p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-secondary transition-colors" aria-label="Notifiche">
              <Bell size={18} />
              {pendingCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-amber-500 rounded-full text-[11px] font-black text-primary flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </Link>
            <button className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-secondary transition-colors" aria-label="Aiuto">
              <HelpCircle size={18} />
            </button>
            <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-xs font-black ml-1">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 w-full">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around items-center z-40">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 py-2 px-2 min-w-[48px] text-[11px] rounded-lg transition-colors ${
                  active ? 'text-secondary font-black bg-secondary/10' : 'text-slate-400'
                }`}
              >
                <div className="relative">
                  <Icon size={20} />
                  {href === '/admin/approvals' && pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-amber-500 rounded-full text-[8px] font-black text-primary flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </div>
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
