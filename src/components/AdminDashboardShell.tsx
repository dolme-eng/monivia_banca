'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  UserPlus,
  CheckCircle2,
  Settings,
  Search,
  Bell,
  HelpCircle,
  Plus,
  Menu,
  X,
  Clock,
  LogOut,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Panoramica', icon: LayoutDashboard },
  { href: '/admin/timeline', label: 'Timeline', icon: Clock },
  { href: '/admin/provision', label: 'Provisioning', icon: UserPlus },
  { href: '/admin/approvals', label: 'Approvazioni', icon: CheckCircle2 },
];

export default function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch('/api/admin/transactions');
        const data = await res.json();
        if (Array.isArray(data)) {
          setPendingCount(data.length);
        }
      } catch {}
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* ===== Sidebar (desktop) ===== */}
      <aside className="hidden md:flex flex-col h-screen w-64 bg-primary p-4 gap-3 shadow-md fixed left-0 top-0 z-40">
        {/* Brand */}
        <div className="mb-6 px-3">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
              <span className="text-sm font-black text-primary">A</span>
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block leading-tight">
                MO<span className="text-secondary">NIVIA</span>
              </span>
              <span className="text-[9px] text-white/40 uppercase tracking-[0.18em]">Amministrazione</span>
            </div>
          </Link>
        </div>

        {/* Nav */}
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
                  <span className="ml-auto bg-amber-500 text-primary text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* CTA */}
        <Link
          href="/admin/provision"
          className="mt-auto w-full py-3 bg-secondary text-primary font-black rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-cyan-300 transition-colors"
        >
          <Plus size={16} />
          Nuovo Provisioning
        </Link>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
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
              <span className="text-xl font-black tracking-tight text-white">
                MO<span className="text-secondary">NIVIA</span>
              </span>
              <button onClick={() => setMobileOpen(false)} className="text-white/60 hover:text-white">
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
                      <span className="ml-auto bg-amber-500 text-primary text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* ===== Main area ===== */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200/70 h-16 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 text-slate-500 hover:text-primary"
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
                className="pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 text-slate-400 hover:text-secondary transition-colors" aria-label="Notifiche">
              <Bell size={18} />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-amber-500 rounded-full text-[8px] font-black text-primary flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </button>
            <button className="p-2 text-slate-400 hover:text-secondary transition-colors" aria-label="Aiuto">
              <HelpCircle size={18} />
            </button>
            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-xs font-black ml-1">
              AD
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center z-40">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 text-[10px] ${
                  active ? 'text-secondary font-black' : 'text-slate-400'
                }`}
              >
                <div className="relative">
                  <Icon size={20} />
                  {href === '/admin/approvals' && pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 rounded-full text-[7px] font-black text-primary flex items-center justify-center">
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
