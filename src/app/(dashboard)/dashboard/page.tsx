'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatAmount, formatTime } from '@/lib/format';
import {
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  CheckCircle2,
  Wallet,
  CreditCard,
  ArrowRight,
  Send,
  Receipt,
  Loader2,
  Lock,
} from 'lucide-react';
import { authFetch } from '@/lib/auth-client';

interface UserData {
  nome: string;
  cognome: string;
  email: string;
  totalBalance: number;
  accounts: {
    id: string;
    iban: string;
    balance: number;
    currency: string;
    status: string;
    cards: { id: string; number: string; expiry: string }[];
  }[];
  recentTransactions: {
    id: string;
    type: string;
    amount: number;
    description: string;
    status: string;
    createdAt: string;
  }[];
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await authFetch('/api/user/account');
        if (res.status === 401) {
          window.location.replace('/login');
          return;
        }
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
        } else {
          setError('Impossibile caricare i dati del conto.');
        }
      } catch {
        setError('Errore di connessione.');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const getIcon = (type: string) => {
    if (type === 'CREDIT' || type === 'TRANSFER_IN') return ArrowDownToLine;
    if (type === 'DEBIT') return ArrowUpFromLine;
    return Send;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-secondary" />
      </div>
    );
  }

  const account = user?.accounts?.[0];
  const balance = account?.balance ?? 0;
  const firstName = user?.nome ?? 'Cliente';
  const isPending = account?.status === 'PENDING';
  const isFrozen = account?.status === 'FROZEN';

  if (isPending || isFrozen) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${isPending ? 'bg-amber-50' : 'bg-blue-50'}`}>
            {isPending ? <Clock size={28} className="text-amber-500" /> : <Lock size={28} className="text-blue-500" />}
          </div>
          <h2 className="text-lg font-black text-primary mb-2">
            {isPending ? 'Conto in attesa di validazione' : 'Conto congelato'}
          </h2>
          <p className="text-sm text-slate-500">
            {isPending
              ? 'Il tuo conto è stato creato ed è in attesa di validazione da parte del nostro team. Riceverai una notizia via email una volta attivato.'
              : 'Il tuo conto è stato congelato. Contatta il nostro supporto per maggiori informazioni.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-black text-red-600 flex items-center gap-2">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary">Panoramica</h1>
          <p className="text-sm text-slate-500 mt-1">Bentornato, {firstName}. Ecco il tuo conto.</p>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Balance Card */}
        <div className="col-span-12 lg:col-span-4 bg-primary text-white p-6 rounded-xl shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-secondary/10 rounded-full blur-3xl" aria-hidden />
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary">Saldo Totale</span>
              <Wallet size={18} className="text-secondary" />
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">{formatAmount(balance)} €</p>
              <div className="flex items-center gap-1.5 text-emerald-400 mt-2">
                <TrendingUp size={14} />
                <span className="text-[11px] font-black">Conto attivo</span>
              </div>
            </div>
          </div>
          <div className="mt-6 flex gap-4 relative z-10">
            <div className="flex-1">
              <p className="text-[11px] text-white/50">IBAN</p>
              <p className="text-xs font-black font-mono truncate">{account?.iban ?? '—'}</p>
            </div>
            <div className="flex-1 border-l border-white/10 pl-4">
              <p className="text-[11px] text-white/50">Valuta</p>
              <p className="text-lg font-black">{account?.currency ?? 'EUR'}</p>
            </div>
          </div>
        </div>

        {/* Card Preview */}
        <div className="col-span-12 lg:col-span-8 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="bg-gradient-to-br from-primary via-slate-800 to-primary p-6 lg:p-8 text-white relative min-h-[220px] lg:min-h-[260px] flex flex-col justify-between">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-secondary rounded-full blur-3xl" />
              <div className="absolute -left-8 -bottom-8 w-48 h-48 bg-accent rounded-full blur-3xl" />
            </div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Carta Principale</p>
                <p className="text-sm font-black mt-1 text-secondary">{account?.currency ?? 'EUR'}</p>
              </div>
              <div className="flex gap-2">
                <Link href="/dashboard/cards" className="px-3 py-1.5 min-h-[44px] text-[11px] font-black bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center">
                  Gestisci
                </Link>
              </div>
            </div>
            <div className="relative z-10 mt-auto">
              <p className="text-xl lg:text-2xl font-black tracking-[0.15em] font-mono mb-4">
                {account?.cards?.[0]?.number ?? '•••• •••• •••• ••••'}
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-white/40 uppercase">Titolare</p>
                  <p className="text-sm font-black mt-0.5">{user?.nome} {user?.cognome}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-white/40 uppercase">Scadenza</p>
                  <p className="text-sm font-black font-mono mt-0.5">{account?.cards?.[0]?.expiry ?? '••/••'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200/80 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-sm font-black text-primary">Transazioni Recenti</h3>
            <Link href="/dashboard/payments" className="text-secondary text-xs font-black hover:underline py-2 px-1 min-h-[44px] flex items-center shrink-0">
              Vedi tutte
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {!user || user.recentTransactions.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <Receipt size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Nessuna transazione recente</p>
              </div>
            ) : (
              user.recentTransactions.map((tx) => {
                const Icon = getIcon(tx.type);
                const isCredit = tx.type === 'CREDIT' || tx.type === 'TRANSFER_IN';
                return (
                  <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-primary truncate">{tx.description}</p>
                        <p className="text-[11px] text-slate-400">{formatTime(tx.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${isCredit ? 'text-emerald-600' : 'text-primary'}`}>
                        {isCredit ? '+' : '-'}{formatAmount(Math.abs(tx.amount))} €
                      </p>
                      {tx.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-amber-600">
                          <Clock size={8} /> In sospeso
                        </span>
                      ) : tx.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-emerald-600">
                          <CheckCircle2 size={8} /> Completato
                        </span>
                      ) : tx.status === 'CANCELLED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-slate-500">
                          Annullato
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-red-500">
                          Rifiutato
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/80 p-6 rounded-xl" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-black text-primary mb-5">Azioni Rapide</h3>
            <div className="flex flex-col gap-3">
              <Link href="/dashboard/payments" className="flex items-center gap-3 w-full p-3 bg-primary text-white rounded-xl hover:bg-slate-800 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0">
                  <Send size={16} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black">Nuovo Trasferimento</p>
                  <p className="text-[11px] text-white/50">Trasferisci fondi</p>
                </div>
                <ArrowRight size={14} className="ml-auto group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/dashboard/prelievo" className="flex items-center gap-3 w-full p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <ArrowUpFromLine size={16} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-primary">Prelievo</p>
                  <p className="text-[11px] text-slate-400">Richiedi prelievo</p>
                </div>
                <ArrowRight size={14} className="ml-auto text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/dashboard/cards" className="flex items-center gap-3 w-full p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <CreditCard size={16} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-primary">Le mie Carte</p>
                  <p className="text-[11px] text-slate-400">Gestisci la carta</p>
                </div>
                <ArrowRight size={14} className="ml-auto text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
