'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMySession } from '@/lib/use-my-session';
import { useSelectedAccount } from '@/lib/selected-account';
import {
  Wallet,
  CreditCard,
  ArrowRightLeft,
  Settings,
  ArrowDownToLine,
  Menu,
  X,
  LogOut,
  Clock,
  Lock,
  History,
  ChevronDown,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { csrfFetch } from '@/lib/csrf-client';
import NotificationBell from '@/components/NotificationBell';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Conto', icon: Wallet },
  { href: '/dashboard/cards', label: 'Carte', icon: CreditCard },
  { href: '/dashboard/payments', label: 'Pagamenti', icon: ArrowRightLeft },
  { href: '/dashboard/prelievo', label: 'Prelievo', icon: ArrowDownToLine },
  { href: '/dashboard/transactions', label: 'Storico', icon: History },
  { href: '/dashboard/settings', label: 'Impostazioni', icon: Settings },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The session hook needs the selected account id so `accountStatus` reflects
  // the account on screen, not always the first one.
  const { accounts, selectedAccount, setSelectedAccount, selectedAccountId } =
    useSelectedAccount();
  const { data: session } = useMySession(selectedAccountId);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mobileAccountMenuRef = useRef<HTMLDivElement>(null);

  // Both switchers had no dismissal path: Escape did nothing and a click
  // outside left the menu hanging open over the page.
  useEffect(() => {
    if (!accountDropdownOpen && !mobileAccountOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountDropdownOpen(false);
        setMobileAccountOpen(false);
      }
    };
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (accountDropdownOpen && accountMenuRef.current && !accountMenuRef.current.contains(t)) {
        setAccountDropdownOpen(false);
      }
      if (mobileAccountOpen && mobileAccountMenuRef.current && !mobileAccountMenuRef.current.contains(t)) {
        setMobileAccountOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
    };
  }, [accountDropdownOpen, mobileAccountOpen]);

  // Opening the mobile drawer must not leave the inline switcher open.
  useEffect(() => {
    if (mobileOpen) setAccountDropdownOpen(false);
  }, [mobileOpen]);

  const handleSignOut = async () => {
    try {
      await csrfFetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.replace('/login');
  };

  const user = session?.user;
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '—';
  const accountStatus = user?.accountStatus;
  const isRestricted = accountStatus === 'PENDING' || accountStatus === 'FROZEN';

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
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-white focus:text-primary focus:underline">
        Vai al contenuto principale
      </a>
      {/* ===== Sidebar (desktop) ===== */}
      <aside aria-label="Navigazione laterale" className="hidden md:flex flex-col h-screen w-64 bg-primary p-4 gap-3 shadow-md fixed left-0 top-0 z-40">
        <div className="mb-6 px-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-xl font-black tracking-tight text-white">
              MO<span className="text-secondary">NIVIA</span>
            </span>
            <span className="relative -top-2.5 text-[11px] font-black uppercase tracking-[0.25em] text-white/60">
              Banca
            </span>
          </Link>
        </div>

        {/* Account Switcher */}
        {accounts.length > 1 && selectedAccount && (
          <div className="px-3 mb-2">
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                aria-haspopup="listbox"
                aria-expanded={accountDropdownOpen}
                aria-controls="account-switcher-list"
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/10 text-white text-sm font-black hover:bg-white/15 transition-colors"
              >
                <span className="truncate">{selectedAccount.iban.slice(0, 12)}...</span>
                <ChevronDown size={14} className={`shrink-0 transition-transform ${accountDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {accountDropdownOpen && (
                <div
                  id="account-switcher-list"
                  role="listbox"
                  aria-label="Seleziona un conto"
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden"
                >
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      role="option"
                      aria-selected={acc.id === selectedAccount.id}
                      onClick={() => { setSelectedAccount(acc.id); setAccountDropdownOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                        acc.id === selectedAccount.id ? 'bg-secondary/10' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-black shrink-0">
                        {acc.iban.slice(-2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-primary truncate">{acc.iban}</p>
                        <p className="text-[11px] text-slate-600">{acc.balance.toLocaleString('it-IT')} €</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <nav aria-label="Sezioni del conto" className="flex flex-col gap-1 flex-grow">
          {(isRestricted ? NAV_ITEMS.slice(0, 1) : NAV_ITEMS).map(({ href, label, icon: Icon }) => {
            const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
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

        {isRestricted && (
          <div className={`mx-3 mb-3 p-3 rounded-lg text-[11px] font-black flex items-center gap-2 ${
            accountStatus === 'PENDING' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
          }`}>
            {accountStatus === 'PENDING' ? <Clock size={14} /> : <Lock size={14} />}
            {accountStatus === 'PENDING' ? 'Conto in attesa di validazione' : 'Conto congelato'}
          </div>
        )}

        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center text-secondary text-xs font-black">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate">{user?.name ?? '—'}</p>
              <p className="text-[11px] text-white/60 truncate">{user?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-black text-white/60 hover:bg-white/10 hover:text-white transition-all"
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
          <aside aria-label="Menu di navigazione" className="absolute left-0 top-0 bottom-0 w-64 bg-primary p-4 gap-3 flex flex-col shadow-xl">
            <div className="flex items-center justify-between mb-6 px-1">
              <span className="flex items-center gap-1">
                <span className="text-xl font-black tracking-tight text-white">
                  MO<span className="text-secondary">NIVIA</span>
                </span>
                <span className="relative -top-2.5 text-[11px] font-black uppercase tracking-[0.25em] text-white/60">
                  Banca
                </span>
              </span>
              <button onClick={() => setMobileOpen(false)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/60 hover:text-white rounded-lg">
                <X size={20} />
              </button>
            </div>
            {/* Account Switcher — was missing entirely here, so a mobile client
                with more than one account could never switch. */}
            {accounts.length > 1 && selectedAccount && (
              <div className="mb-2" ref={mobileAccountMenuRef}>
                <button
                  onClick={() => setMobileAccountOpen(!mobileAccountOpen)}
                  aria-haspopup="listbox"
                  aria-expanded={mobileAccountOpen}
                  aria-controls="mobile-account-switcher-list"
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] rounded-lg bg-white/10 text-white text-sm font-black hover:bg-white/15 transition-colors"
                >
                  <span className="truncate">{selectedAccount.iban.slice(0, 16)}...</span>
                  <ChevronDown size={14} className={`shrink-0 transition-transform ${mobileAccountOpen ? 'rotate-180' : ''}`} />
                </button>
                {mobileAccountOpen && (
                  <div
                    id="mobile-account-switcher-list"
                    role="listbox"
                    aria-label="Seleziona un conto"
                    className="mt-1 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden"
                  >
                    {accounts.map((acc) => (
                      <button
                        key={acc.id}
                        role="option"
                        aria-selected={acc.id === selectedAccount.id}
                        onClick={() => {
                          setSelectedAccount(acc.id);
                          setMobileAccountOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-3 min-h-[44px] text-left hover:bg-slate-50 transition-colors ${
                          acc.id === selectedAccount.id ? 'bg-secondary/10' : ''
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-black shrink-0">
                          {acc.iban.slice(-2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-primary truncate">{acc.iban}</p>
                          <p className="text-[11px] text-slate-600">
                            {acc.balance.toLocaleString('it-IT')} €
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <nav aria-label="Sezioni del menu" className="flex flex-col gap-1 flex-grow">
              {(isRestricted ? NAV_ITEMS.slice(0, 1) : NAV_ITEMS).map(({ href, label, icon: Icon }) => {
                const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
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
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-black text-white/60 hover:bg-white/10 hover:text-white transition-all"
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
              className="md:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-600 hover:text-primary rounded-lg"
              onClick={() => setMobileOpen(true)}
              aria-label="Apri menu"
              aria-expanded={mobileOpen}
            >
              <Menu size={20} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center text-secondary-text text-xs font-black ml-1">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main id="main-content" className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 w-full">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav aria-label="Navigazione rapida" className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around items-center z-40">
          {(isRestricted ? NAV_ITEMS.slice(0, 1) : NAV_ITEMS).map(({ href, label, icon: Icon }) => {
            const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2 px-2 min-w-[48px] text-[11px] rounded-lg transition-colors ${
                  active ? 'text-secondary-text font-black bg-secondary/10' : 'text-slate-600'
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
