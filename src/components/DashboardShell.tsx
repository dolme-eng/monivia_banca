'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMySession } from '@/lib/use-my-session';
import {
  Wallet,
  CreditCard,
  ArrowRightLeft,
  Settings,
  ArrowDownToLine,
  Search,
  Bell,
  HelpCircle,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Conto', icon: Wallet },
  { href: '/dashboard/cards', label: 'Carte', icon: CreditCard },
  { href: '/dashboard/payments', label: 'Pagamenti', icon: ArrowRightLeft },
  { href: '/dashboard/prelievo', label: 'Prelievo', icon: ArrowDownToLine },
  { href: '/dashboard/settings', label: 'Impostazioni', icon: Settings },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useMySession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.replace('/login');
  };

  const user = session?.user;
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '—';

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* ===== Sidebar (desktop) ===== */}
      <aside className="hidden md:flex flex-col h-screen w-64 bg-primary p-4 gap-3 shadow-md fixed left-0 top-0 z-40">
        <div className="mb-6 px-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-xl font-black tracking-tight text-white">
              MO<span className="text-secondary">NIVIA</span>
            </span>
          </Link>
          <p className="text-[11px] text-white/50 mt-1">Banca Personale</p>
        </div>

        <nav className="flex flex-col gap-1 flex-grow">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
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
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center text-secondary text-xs font-black">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate">{user?.name ?? '—'}</p>
              <p className="text-[11px] text-white/40 truncate">{user?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-black text-white/40 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut size={18} />
            Esci
          </button>
        </div>
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
              <button onClick={() => setMobileOpen(false)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/60 hover:text-white rounded-lg">
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 flex-grow">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
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
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={handleSignOut}
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
                placeholder="Cerca transazioni..."
                className="pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-secondary transition-colors" aria-label="Notifiche">
              <Bell size={18} />
            </button>
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
            const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 py-2 px-2 min-w-[48px] text-[11px] ${
                  active ? 'text-secondary font-black' : 'text-slate-400'
                }`}
              >
                <Icon size={20} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
