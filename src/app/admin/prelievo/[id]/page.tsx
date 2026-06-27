'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  CreditCard,
  FileText,
  AlertTriangle,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { csrfFetch } from '@/lib/csrf-client';
import ConfirmModal from '@/components/ConfirmModal';

interface TransactionDetail {
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
    balance: number;
    user: {
      nome: string;
      cognome: string;
      email: string;
    };
  };
}

export default function AdminPrelievoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const txId = params.id as string;

  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'APPROVE' | 'REJECT' | null>(null);

  const fetchTx = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/transactions`);
      if (!res.ok) throw new Error('Errore del server');
      const data = await res.json();
      const found = Array.isArray(data) ? data.find((t: any) => t.id === txId) : null;
      if (found) {
        setTx(found);
      }
    } catch {
      setResult({ type: 'error', message: 'Impossibile caricare i dettagli della transazione' });
    } finally {
      setLoading(false);
    }
  }, [txId]);

  useEffect(() => {
    fetchTx();
  }, [fetchTx]);

  const handleAction = async (action: 'APPROVE' | 'REJECT') => {
    setActionLoading(action);
    setResult(null);
    setConfirmOpen(false);

    try {
      const res = await csrfFetch('/api/admin/transactions', {
        method: 'POST',
        body: JSON.stringify({ transactionId: txId, action }),
      });

      const data = await res.json();

      if (data.success) {
        setResult({ type: 'success', message: data.message });
        fetchTx();
      } else {
        setResult({ type: 'error', message: data.error });
      }
    } catch {
      setResult({ type: 'error', message: 'Errore di connessione' });
    } finally {
      setActionLoading(null);
    }
  };

  const openConfirm = (action: 'APPROVE' | 'REJECT') => {
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const formatAmount = (amount: number) =>
    Math.abs(amount).toLocaleString('it-IT', { minimumFractionDigits: 2 });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getTimeline = (status: string) => {
    const steps = [
      { label: 'Richiesta Ricevuta', icon: FileText, done: true },
      { label: 'In Revisione', icon: Clock, done: status !== 'PENDING' || true },
      { label: status === 'APPROVED' ? 'Approvata' : status === 'REJECTED' ? 'Rifiutata' : 'In Attesa', icon: status === 'APPROVED' ? CheckCircle2 : status === 'REJECTED' ? XCircle : Clock, done: status !== 'PENDING' },
    ];
    return steps;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-secondary" />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={32} className="text-amber-400 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Transazione non trovata</p>
        <Link href="/admin/approvals" className="text-sm text-secondary font-black hover:underline mt-2 inline-block">
          Torna alle Approvazioni
        </Link>
      </div>
    );
  }

  const timeline = getTimeline(tx.status);
  const isPending = tx.status === 'PENDING';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-slate-500" />
        </button>
        <div>
          <h1 className="text-xl font-black text-primary">Dettaglio Transazione</h1>
          <p className="text-xs text-slate-400 mt-0.5">Rivedi e gestisci la richiesta di prelievo.</p>
        </div>
      </div>

      {result && (
        <div className={`p-4 rounded-xl border text-sm font-black flex items-center gap-2 ${
          result.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {result.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {result.message}
        </div>
      )}

      <div className="bg-white rounded-xl p-6 border border-slate-200/80" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h3 className="text-sm font-black text-primary mb-5">Stato della Richiesta</h3>
        <div className="flex items-center justify-between relative">
          <div className="absolute top-5 left-[15%] right-[15%] h-0.5 bg-slate-200" />
          <div
            className="absolute top-5 left-[15%] h-0.5 bg-secondary transition-all duration-500"
            style={{
              width: tx.status === 'APPROVED' ? '70%' : tx.status === 'REJECTED' ? '35%' : '0%',
            }}
          />

          {timeline.map((step, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center text-center w-1/3">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                step.done
                  ? tx.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-600'
                    : tx.status === 'REJECTED' && i === 2
                    ? 'bg-red-100 text-red-500'
                    : 'bg-secondary/10 text-secondary'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                <step.icon size={18} />
              </div>
              <span className="text-[11px] font-black mt-2 text-slate-500">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-black text-primary mb-4 flex items-center gap-2">
            <User size={14} className="text-secondary" />
            Cliente
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-xs text-slate-400">Nome</span>
              <span className="text-sm font-black text-primary">{tx.account.user.nome} {tx.account.user.cognome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-400">Email</span>
              <span className="text-xs text-slate-600">{tx.account.user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-400">IBAN</span>
              <span className="text-xs text-slate-600 font-mono truncate min-w-0">{tx.account.iban}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-400">Saldo Attuale</span>
              <span className="text-sm font-black text-primary">{formatAmount(tx.account.balance)} €</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-black text-primary mb-4 flex items-center gap-2">
            <CreditCard size={14} className="text-secondary" />
            Transazione
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-xs text-slate-400">Importo</span>
              <span className="text-lg font-black text-primary">{formatAmount(tx.amount)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-400">Tipo</span>
              <span className="text-sm font-black text-primary">
                {tx.type === 'DEBIT' ? 'Prelievo' : tx.type === 'TRANSFER_OUT' ? 'Trasferimento' : tx.type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-400">Stato</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded ${
                tx.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                tx.status === 'REJECTED' ? 'bg-red-50 text-red-500' :
                'bg-amber-50 text-amber-600'
              }`}>
                {tx.status === 'APPROVED' ? 'Approvata' : tx.status === 'REJECTED' ? 'Rifiutata' : 'In Attesa'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-400">Data</span>
              <span className="text-xs text-slate-600">{formatDate(tx.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-slate-200/80" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h3 className="text-sm font-black text-primary mb-3 flex items-center gap-2">
          <FileText size={14} className="text-secondary" />
          Descrizione
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">{tx.description}</p>
      </div>

      {isPending && (
        <div className="bg-white rounded-xl p-5 border border-slate-200/80" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-black text-primary mb-4">Azioni</h3>
          <div className="flex gap-3">
            <button
              onClick={() => openConfirm('APPROVE')}
              disabled={actionLoading !== null}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'APPROVE' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Approva
            </button>
            <button
              onClick={() => openConfirm('REJECT')}
              disabled={actionLoading !== null}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-black hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'REJECT' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <XCircle size={16} />
              )}
              Rifiuta
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 text-center">
            L&apos;approvazione debiterà automaticamente il saldo del conto.
          </p>
        </div>
      )}

      <div className="text-center">
        <Link href="/admin/approvals" className="text-sm text-secondary font-black hover:underline">
          ← Torna alle Approvazioni
        </Link>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={confirmAction === 'APPROVE' ? 'Approvare la transazione?' : 'Rifiutare la transazione?'}
        message={
          confirmAction === 'APPROVE'
            ? 'Questa azione debiterà automaticamente il saldo del conto del cliente. Vuoi procedere?'
            : 'La transazione verrà rifiutata e il saldo del conto non verrà modificato. Vuoi procedere?'
        }
        confirmLabel={confirmAction === 'APPROVE' ? 'Approva' : 'Rifiuta'}
        variant={confirmAction === 'APPROVE' ? 'info' : 'danger'}
        loading={actionLoading !== null}
        onConfirm={() => confirmAction && handleAction(confirmAction)}
        onCancel={() => { setConfirmOpen(false); setConfirmAction(null); }}
      />
    </div>
  );
}
