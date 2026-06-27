'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  Send,
  CreditCard,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { csrfFetch } from '@/lib/csrf-client';
import ConfirmModal from '@/components/ConfirmModal';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  account: {
    iban: string;
    user: { nome: string; cognome: string; email: string };
  };
}

export default function ApprovalsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'APPROVE' | 'REJECT' } | null>(null);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/admin/transactions?status=PENDING');
      if (!res.ok) throw new Error('Errore del server');
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError('Impossibile caricare le transazioni. Riprovo automaticamente...');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (transactionId: string, action: 'APPROVE' | 'REJECT') => {
    setActionId(transactionId);
    setConfirmOpen(false);
    try {
      const res = await csrfFetch('/api/admin/transactions', {
        method: 'POST',
        body: JSON.stringify({ transactionId, action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchTransactions();
      } else {
        setError(data.error || 'Azione non riuscita');
      }
    } catch {
      setError('Errore di connessione durante l\'azione');
    } finally {
      setActionId(null);
      setConfirmAction(null);
    }
  };

  const openConfirm = (id: string, action: 'APPROVE' | 'REJECT') => {
    setConfirmAction({ id, action });
    setConfirmOpen(true);
  };

  const formatAmount = (amount: number) =>
    Math.abs(amount).toLocaleString('it-IT', { minimumFractionDigits: 2 });

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Adesso';
    if (mins < 60) return `${mins} min fa`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ore fa`;
    return `${Math.floor(hours / 24)} giorni fa`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-primary">Approvazioni</h1>
        <p className="text-sm text-slate-500 mt-1">
          Controlla e approva le richieste dei clienti. Ogni transazione è in attesa di validazione.
        </p>
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

      <div className="flex gap-3">
        <div className="bg-white rounded-xl px-4 py-3 border border-slate-200/80 flex items-center gap-3" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock size={14} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">In Attesa</p>
            <p className="text-lg font-black text-primary">{loading ? '—' : transactions.length}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-secondary" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center border border-slate-200/80" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="mb-2 text-xl font-black text-primary">Nessuna transazione in sospeso</h3>
          <p className="text-sm text-slate-500">Tutte le richieste sono state elaborate.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-white rounded-xl border border-slate-200/80 p-5 hover:border-secondary/30 transition-all"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    tx.type === 'DEBIT' || tx.type === 'TRANSFER_OUT'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {tx.type === 'DEBIT' || tx.type === 'TRANSFER_OUT' ? <Send size={16} /> : <CreditCard size={16} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-black text-primary">
                        {tx.type === 'DEBIT' ? 'Prelievo' : tx.type === 'TRANSFER_OUT' ? 'Trasferimento' : tx.type}
                      </span>
                      <span className="text-[11px] text-slate-500">• {formatTime(tx.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{tx.description}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {tx.account.user.nome} {tx.account.user.cognome} • {tx.account.iban}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 pl-14 sm:pl-0">
                  <span className="text-lg font-black text-primary">
                    {formatAmount(tx.amount)} €
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/prelievo/${tx.id}`}
                      className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-400 hover:text-secondary"
                      title="Vedi dettaglio"
                    >
                      <ArrowRight size={14} />
                    </Link>
                    <button
                      onClick={() => openConfirm(tx.id, 'REJECT')}
                      disabled={actionId === tx.id}
                      className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors text-slate-400 hover:text-red-500 disabled:opacity-50"
                      title="Rifiuta"
                    >
                      {actionId === tx.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    </button>
                    <button
                      onClick={() => openConfirm(tx.id, 'APPROVE')}
                      disabled={actionId === tx.id}
                      className="px-4 py-3 min-h-[44px] bg-emerald-600 text-white rounded-lg text-xs font-black hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {actionId === tx.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Approva
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title={confirmAction?.action === 'APPROVE' ? 'Approvare la transazione?' : 'Rifiutare la transazione?'}
        message={
          confirmAction?.action === 'APPROVE'
            ? 'Questa azione debiterà automaticamente il saldo del conto del cliente. Vuoi procedere?'
            : 'La transazione verrà rifiutata e il saldo del conto non verrà modificato. Vuoi procedere?'
        }
        confirmLabel={confirmAction?.action === 'APPROVE' ? 'Approva' : 'Rifiuta'}
        variant={confirmAction?.action === 'APPROVE' ? 'info' : 'danger'}
        loading={actionId !== null}
        onConfirm={() => confirmAction && handleAction(confirmAction.id, confirmAction.action)}
        onCancel={() => { setConfirmOpen(false); setConfirmAction(null); }}
      />
    </div>
  );
}
