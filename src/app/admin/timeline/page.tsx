'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  CreditCard,
  Loader2,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  reference: string | null;
  createdAt: string;
  updatedAt: string;
  account: {
    id: string;
    iban: string;
    user: { nome: string; cognome: string; email: string };
  };
}

export default function AdminTimelinePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/transactions');
      if (!res.ok) throw new Error('Errore del server');
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError('Impossibile caricare la timeline. Riprovo automaticamente...');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 15000);
    return () => clearInterval(interval);
  }, [fetchTransactions]);

  const filtered = filter === 'ALL'
    ? transactions
    : transactions.filter((t) => t.status === filter);

  const stats = {
    total: transactions.length,
    pending: transactions.filter((t) => t.status === 'PENDING').length,
    approved: transactions.filter((t) => t.status === 'APPROVED').length,
    rejected: transactions.filter((t) => t.status === 'REJECTED').length,
  };

  const formatAmount = (amount: number) =>
    Math.abs(amount).toLocaleString('it-IT', { minimumFractionDigits: 2 });

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Adesso';
    if (mins < 60) return `${mins} min fa`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h fa`;
    return `${Math.floor(hours / 24)}g fa`;
  };

  const getProgressPercent = (tx: Transaction) => {
    if (tx.status === 'APPROVED') return 100;
    if (tx.status === 'REJECTED') return 100;
    const age = Date.now() - new Date(tx.createdAt).getTime();
    const maxAge = 24 * 60 * 60 * 1000;
    return Math.min(Math.floor((age / maxAge) * 80), 80);
  };

  const getProgressColor = (status: string) => {
    if (status === 'APPROVED') return 'bg-emerald-500';
    if (status === 'REJECTED') return 'bg-red-500';
    return 'bg-amber-400';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-primary">Timeline Transazioni</h1>
        <p className="text-sm text-slate-500 mt-1">Monitora lo stato di tutte le transazioni in tempo reale.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <XCircle size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Totale', value: stats.total, color: 'text-primary' },
          { label: 'In Attesa', value: stats.pending, color: 'text-amber-600' },
          { label: 'Approvate', value: stats.approved, color: 'text-emerald-600' },
          { label: 'Rifiutate', value: stats.rejected, color: 'text-red-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-200/80" style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">{stat.label}</p>
            <p className={`text-xl font-black ${stat.color}`}>{loading ? '—' : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 bg-white rounded-xl p-1.5 border border-slate-200/80 w-fit" style={{ boxShadow: 'var(--shadow-card)' }}>
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
              filter === f
                ? 'bg-primary text-white'
                : 'text-slate-400 hover:text-primary hover:bg-slate-50'
            }`}
          >
            {f === 'ALL' ? 'Tutte' : f === 'PENDING' ? 'In Attesa' : f === 'APPROVED' ? 'Approvate' : 'Rifiutate'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-secondary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <AlertTriangle size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Nessuna transazione trovata.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tx) => {
            const progress = getProgressPercent(tx);
            return (
              <Link
                key={tx.id}
                href={`/admin/prelievo/${tx.id}`}
                className="block bg-white rounded-xl p-5 border border-slate-200/80 hover:border-secondary/30 transition-all group"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tx.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                      tx.status === 'REJECTED' ? 'bg-red-50 text-red-500' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {tx.type === 'DEBIT' || tx.type === 'TRANSFER_OUT' ? (
                        <Send size={16} />
                      ) : (
                        <CreditCard size={16} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-black text-primary">
                        {tx.account.user.nome} {tx.account.user.cognome}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {tx.type === 'DEBIT' ? 'Prelievo' : tx.type === 'TRANSFER_OUT' ? 'Trasferimento' : tx.type} — {tx.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-primary">{formatAmount(tx.amount)} €</p>
                    <p className="text-[10px] text-slate-400">{formatTime(tx.createdAt)}</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(tx.status)}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[9px] text-slate-400">Richiesta</span>
                    <span className={`text-[9px] font-black ${
                      tx.status === 'APPROVED' ? 'text-emerald-600' :
                      tx.status === 'REJECTED' ? 'text-red-500' :
                      'text-amber-600'
                    }`}>
                      {tx.status === 'APPROVED' ? 'Completata' : tx.status === 'REJECTED' ? 'Rifiutata' : `${progress}%`}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <span className="text-[10px] text-secondary font-black opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Vedi dettaglio <ArrowRight size={10} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
