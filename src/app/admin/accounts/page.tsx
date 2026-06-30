'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatAmount } from '@/lib/format';
import {
  Search,
  CheckCircle2,
  XCircle,
  Ban,
  Unlock,
  Trash2,
  Loader2,
  User,
  CreditCard,
  Shield,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { csrfFetch } from '@/lib/csrf-client';
import ConfirmModal from '@/components/ConfirmModal';

interface Account {
  id: string;
  iban: string;
  balance: number;
  currency: string;
  status: string;
  blockedAt: string | null;
  createdAt: string;
  user: { id: string; email: string; nome: string; cognome: string };
  cards: { number: string; holder: string }[];
}

type ConfirmAction = {
  type: 'validate' | 'freeze' | 'unfreeze' | 'block' | 'unblock' | 'delete';
  account: Account;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim().length >= 2) params.set('q', searchQuery.trim());
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/admin/accounts?${params.toString()}`);
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleAction = async (action: ConfirmAction) => {
    setActionLoading(action.type);
    try {
      if (action.type === 'delete') {
        const res = await csrfFetch(`/api/admin/accounts/${action.account.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete' }),
        });
        if (res.ok) {
          setAccounts((prev) => prev.filter((a) => a.id !== action.account.id));
        }
      } else {
        const res = await csrfFetch(`/api/admin/accounts/${action.account.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: action.type }),
        });
        if (res.ok) {
          const data = await res.json();
          setAccounts((prev) =>
            prev.map((a) =>
              a.id === action.account.id
                ? { ...a, status: data.account.status, blockedAt: data.account.blockedAt }
                : a
            )
          );
        }
      }
    } catch {
      setActionError('Errore durante l\'esecuzione dell\'azione.');
      setActionLoading(null);
      setConfirm(null);
    } finally {
      setActionLoading(null);
      setConfirm(null);
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'PENDING': return { text: 'In attesa', cls: 'bg-amber-50 text-amber-600' };
      case 'ACTIVE': return { text: 'Attivo', cls: 'bg-emerald-50 text-emerald-600' };
      case 'FROZEN': return { text: 'Congelato', cls: 'bg-blue-50 text-blue-600' };
      case 'CLOSED': return { text: 'Chiuso', cls: 'bg-red-50 text-red-500' };
      default: return { text: s, cls: 'bg-slate-100 text-slate-500' };
    }
  };

  const pendingCount = accounts.filter((a) => a.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary">Gestione Conti</h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualizza, valida, congela ed elimina i conti clienti.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg text-xs font-black">
            <Clock size={14} />
            {pendingCount} in attesa di validazione
          </span>
        )}
      </div>

      {actionError && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-black text-red-600 flex items-center gap-2">
          <AlertTriangle size={16} />
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-auto p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-400 hover:text-red-600">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Search + filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca per nome, email o IBAN…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm rounded-lg border border-slate-200 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
            />
          </div>
          <div className="flex gap-2">
            {['', 'PENDING', 'ACTIVE', 'FROZEN', 'CLOSED'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-3 min-h-[44px] text-[11px] font-black rounded-lg transition-colors ${
                  filterStatus === s
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {s === '' ? 'Tutti' : s === 'PENDING' ? 'In attesa' : s === 'ACTIVE' ? 'Attivi' : s === 'FROZEN' ? 'Congelati' : 'Chiusi'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Accounts list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-secondary" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
          <User size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Nessun conto trovato</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => {
            const st = statusLabel(acc.status);
            return (
              <div
                key={acc.id}
                className="bg-white rounded-xl border border-slate-200/80 p-5 hover:shadow-md transition-shadow"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Account info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User size={16} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-primary truncate">
                          {acc.user.nome} {acc.user.cognome}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{acc.user.email}</p>
                      </div>
                      <span className={`ml-auto text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 ${st.cls}`}>
                        {st.text}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 ml-13">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase">IBAN</span>
                        <p className="text-xs font-mono text-slate-600">{acc.iban}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase">Saldo</span>
                        <p className="text-sm font-black text-primary">{formatAmount(acc.balance)} €</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase">Carta</span>
                        <p className="text-xs text-slate-600">{acc.cards[0]?.number ?? '—'}</p>
                      </div>
                      {acc.blockedAt && (
                        <div>
                          <span className="text-[10px] text-red-400 uppercase">Trasferimenti</span>
                          <p className="text-xs font-black text-red-500">Bloccati</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {acc.status === 'PENDING' && (
                      <button
                        onClick={() => setConfirm({ type: 'validate', account: acc })}
                        disabled={actionLoading !== null}
                        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-emerald-600 text-white rounded-lg text-xs font-black hover:bg-emerald-700 transition-colors"
                      >
                        <CheckCircle2 size={14} />
                        Valida
                      </button>
                    )}
                    {acc.status === 'ACTIVE' && (
                      <button
                        onClick={() => setConfirm({ type: 'freeze', account: acc })}
                        disabled={actionLoading !== null}
                        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-black hover:bg-blue-100 transition-colors"
                      >
                        <Ban size={14} />
                        Congela
                      </button>
                    )}
                    {acc.status === 'FROZEN' && (
                      <button
                        onClick={() => setConfirm({ type: 'unfreeze', account: acc })}
                        disabled={actionLoading !== null}
                        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-black hover:bg-emerald-100 transition-colors"
                      >
                        <Unlock size={14} />
                        Scongela
                      </button>
                    )}
                    {acc.status !== 'CLOSED' && (
                      <>
                        {!acc.blockedAt ? (
                          <button
                            onClick={() => setConfirm({ type: 'block', account: acc })}
                            disabled={actionLoading !== null}
                            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-xs font-black hover:bg-amber-100 transition-colors"
                          >
                            <Shield size={14} />
                            Blocca trasferimenti
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirm({ type: 'unblock', account: acc })}
                            disabled={actionLoading !== null}
                            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-black hover:bg-emerald-100 transition-colors"
                          >
                            <Shield size={14} />
                            Sblocca trasferimenti
                          </button>
                        )}
                        <button
                          onClick={() => setConfirm({ type: 'delete', account: acc })}
                          disabled={actionLoading !== null}
                          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-black hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={14} />
                          Elimina
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={!!confirm}
        title={
          confirm?.type === 'validate' ? 'Validare il conto?' :
          confirm?.type === 'freeze' ? 'Congelare il conto?' :
          confirm?.type === 'unfreeze' ? 'Scongelare il conto?' :
          confirm?.type === 'block' ? 'Bloccare i trasferimenti?' :
          confirm?.type === 'unblock' ? 'Sbloccare i trasferimenti?' :
          'Eliminare il conto definitivamente?'
        }
        message={
          confirm?.type === 'delete'
            ? `Questa azione è irreversibile. Il conto di ${confirm?.account.user.nome} ${confirm?.account.user.cognome} e tutti i suoi dati verranno eliminati permanentemente.`
            : confirm?.type === 'validate'
            ? `Il conto di ${confirm?.account.user.nome} ${confirm?.account.user.cognome} verrà attivato e il cliente potrà accedere al servizio.`
            : confirm?.type === 'freeze'
            ? `Il conto di ${confirm?.account.user.nome} ${confirm?.account.user.cognome} verrà congelato. Il cliente non potrà effettuare operazioni.`
            : confirm?.type === 'block'
            ? `I trasferimenti del conto ${confirm?.account.iban} verranno bloccati. Il cliente potrà ricevere ma non inviare fondi.`
            : `I trasferimenti del conto ${confirm?.account.iban} verranno sbloccati.`
        }
        confirmLabel={
          confirm?.type === 'validate' ? 'Valida' :
          confirm?.type === 'freeze' ? 'Congela' :
          confirm?.type === 'unfreeze' ? 'Scongela' :
          confirm?.type === 'block' ? 'Blocca' :
          confirm?.type === 'unblock' ? 'Sblocca' :
          'Elimina'
        }
        variant={confirm?.type === 'delete' ? 'danger' : 'info'}
        loading={actionLoading !== null}
        onConfirm={() => confirm && handleAction(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
