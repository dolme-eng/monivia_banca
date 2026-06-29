'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Download,
  Receipt,
  Loader2,
  BarChart3,
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

  const formatAmount = (amount: number) =>
    Number(amount).toLocaleString('it-IT', { minimumFractionDigits: 2 });

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Adesso';
    if (mins < 60) return `${mins} min fa`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ore fa`;
    return `${Math.floor(hours / 24)} giorni fa`;
  };

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
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-3 min-h-[44px] rounded-lg border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-100 transition-colors">
            <Clock size={14} />
            Ultimi 30 giorni
          </button>
          <button className="flex items-center gap-2 px-4 py-3 min-h-[44px] rounded-lg bg-primary text-white text-sm font-black hover:bg-slate-800 transition-colors">
            <Download size={14} />
            Esporta
          </button>
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

        {/* Spending Trend */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200/80 p-6 rounded-xl flex flex-col" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-primary">Andamento Movimenti</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span className="text-[11px] text-slate-400">Periodo corrente</span>
              </div>
            </div>
          </div>
          {(() => {
            const txs = user?.recentTransactions ?? [];
            if (txs.length === 0) {
              return (
                <div className="flex-grow flex items-center justify-center h-64 text-slate-300">
                  <BarChart3 size={32} />
                </div>
              );
            }
            const now = new Date();
            const days = 28;
            const dailySums: { date: string; label: string; income: number; expense: number }[] = [];
            for (let i = days - 1; i >= 0; i--) {
              const d = new Date(now);
              d.setDate(d.getDate() - i);
              const key = d.toISOString().slice(0, 10);
              const label = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
              dailySums.push({ date: key, label, income: 0, expense: 0 });
            }
            for (const tx of txs) {
              const key = new Date(tx.createdAt).toISOString().slice(0, 10);
              const bucket = dailySums.find((b) => b.date === key);
              if (bucket) {
                const isCredit = tx.type === 'CREDIT' || tx.type === 'TRANSFER_IN';
                if (isCredit) bucket.income += Math.abs(tx.amount);
                else bucket.expense += Math.abs(tx.amount);
              }
            }
            const maxVal = Math.max(1, ...dailySums.map((b) => Math.max(b.income, b.expense)));
            const svgH = 200;
            const padTop = 10;
            const padBot = 20;
            const chartH = svgH - padTop - padBot;
            const barW = 1000 / days;
            const tickLabels = dailySums
              .filter((_, i) => i % 7 === 0 || i === days - 1)
              .map((b) => b.label);
            return (
              <>
                <div className="flex-grow h-48 lg:h-64 relative">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 1000 ${svgH}`}>
                    {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                      <g key={pct}>
                        <line x1="0" y1={padTop + chartH * (1 - pct)} x2="1000" y2={padTop + chartH * (1 - pct)} stroke="#e2e8f0" strokeWidth="1" />
                        <text x="-5" y={padTop + chartH * (1 - pct) + 4} textAnchor="end" className="fill-slate-300 text-[10px] font-black">
                          {Math.round(maxVal * pct).toLocaleString('it-IT')}
                        </text>
                      </g>
                    ))}
                    {dailySums.map((b, i) => {
                      const x = i * barW + 2;
                      const w = barW - 4;
                      const hExp = (b.expense / maxVal) * chartH;
                      const hInc = (b.income / maxVal) * chartH;
                      return (
                        <g key={b.date}>
                          {b.expense > 0 && (
                            <rect
                              x={x}
                              y={padTop + chartH - hExp}
                              width={w}
                              height={hExp}
                              rx="3"
                              fill="#6366f1"
                              opacity="0.8"
                            />
                          )}
                          {b.income > 0 && (
                            <rect
                              x={x}
                              y={padTop + chartH - hInc - hExp}
                              width={w}
                              height={hInc}
                              rx="3"
                              fill="#00d4ff"
                              opacity="0.9"
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className="flex justify-between mt-3 px-1">
                  {tickLabels.map((lbl) => (
                    <span key={lbl} className="text-[11px] text-slate-400">{lbl}</span>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-secondary" />
                    <span className="text-[11px] text-slate-400">Entrate</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-accent" />
                    <span className="text-[11px] text-slate-400">Uscite</span>
                  </div>
                </div>
              </>
            );
          })()}
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

          {/* Account Summary */}
          <div className="bg-white border border-slate-200/80 p-6 rounded-xl" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-black text-primary mb-4">Riepilogo Conto</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Saldo</span>
                <span className="text-sm font-black text-primary">{formatAmount(balance)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">IBAN</span>
                <span className="text-xs font-mono text-slate-600">{account?.iban ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Stato</span>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded ${
                  account?.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                }`}>
                  {account?.status === 'ACTIVE' ? 'Attivo' : account?.status === 'FROZEN' ? 'Congelato' : 'Chiuso'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Carte</span>
                <span className="text-sm font-black text-primary">{account?.cards?.length ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
