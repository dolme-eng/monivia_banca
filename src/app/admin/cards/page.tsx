'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Ban,
  Unlock,
  Clock,
  Trash2,
  Loader2,
  CreditCard,
  AlertTriangle,
  XCircle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { csrfFetch } from '@/lib/csrf-client';
import ConfirmModal from '@/components/ConfirmModal';

interface CardData {
  id: string;
  number: string;
  holder: string;
  expiry: string;
  status: string;
  createdAt: string;
  account: {
    id: string;
    iban: string;
    balance: number;
    status: string;
    user: { id: string; email: string; nome: string; cognome: string };
  };
}

type ConfirmAction = {
  type: 'freeze' | 'unfreeze' | 'expire' | 'reactivate' | 'delete';
  card: CardData;
};

export default function CardsPage() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim().length >= 2) params.set('q', searchQuery.trim());
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/admin/cards?${params.toString()}`);
      const data = await res.json();
      setCards(data.cards || []);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleAction = async (action: ConfirmAction) => {
    setActionLoading(action.type);
    try {
      if (action.type === 'delete') {
        const res = await csrfFetch(`/api/admin/cards/${action.card.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete' }),
        });
        if (res.ok) {
          setCards((prev) => prev.filter((c) => c.id !== action.card.id));
        } else {
          const data = await res.json();
          setActionError(data.error || 'Errore durante l\'eliminazione');
        }
      } else {
        const res = await csrfFetch(`/api/admin/cards/${action.card.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: action.type }),
        });
        if (res.ok) {
          const data = await res.json();
          setCards((prev) =>
            prev.map((c) =>
              c.id === action.card.id ? { ...c, status: data.card.status } : c
            )
          );
        } else {
          const data = await res.json();
          setActionError(data.error || 'Errore durante l\'operazione');
        }
      }
    } catch {
      setActionError('Errore durante l\'esecuzione dell\'azione.');
    } finally {
      setActionLoading(null);
      setConfirm(null);
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'ACTIVE': return { text: 'Attiva', cls: 'bg-emerald-50 text-emerald-600' };
      case 'FROZEN': return { text: 'Congelata', cls: 'bg-blue-50 text-blue-600' };
      case 'EXPIRED': return { text: 'Scaduta', cls: 'bg-red-50 text-red-500' };
      default: return { text: s, cls: 'bg-slate-100 text-slate-500' };
    }
  };

  const accountStatusLabel = (s: string) => {
    switch (s) {
      case 'PENDING': return { text: 'In attesa', cls: 'bg-amber-50 text-amber-600' };
      case 'ACTIVE': return { text: 'Attivo', cls: 'bg-emerald-50 text-emerald-600' };
      case 'FROZEN': return { text: 'Congelato', cls: 'bg-blue-50 text-blue-600' };
      case 'CLOSED': return { text: 'Chiuso', cls: 'bg-red-50 text-red-500' };
      default: return { text: s, cls: 'bg-slate-100 text-slate-500' };
    }
  };

  const frozenCount = cards.filter((c) => c.status === 'FROZEN').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary">Gestione Carte</h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualizza, congela, attiva ed elimina le carte clienti.
          </p>
        </div>
        {frozenCount > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-black">
            <Ban size={14} />
            {frozenCount} congelat{frozenCount === 1 ? 'a' : 'e'}
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

      <div className="bg-white rounded-xl border border-slate-200/80 p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca per intestatario, numero carta o email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm rounded-lg border border-slate-200 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
            />
          </div>
          <div className="flex gap-2">
            {['', 'ACTIVE', 'FROZEN', 'EXPIRED'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-3 min-h-[44px] text-[11px] font-black rounded-lg transition-colors ${
                  filterStatus === s
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {s === '' ? 'Tutte' : s === 'ACTIVE' ? 'Attive' : s === 'FROZEN' ? 'Congelate' : 'Scadute'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-secondary" />
        </div>
      ) : cards.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
          <CreditCard size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Nessuna carta trovata</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const st = statusLabel(card.status);
            const accSt = accountStatusLabel(card.account.status);
            return (
              <div
                key={card.id}
                className="bg-white rounded-xl border border-slate-200/80 p-5 hover:shadow-md transition-shadow"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                        <CreditCard size={16} className="text-secondary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-primary truncate">{card.holder}</p>
                        <p className="text-[11px] text-slate-400 truncate">{card.number}</p>
                      </div>
                      <span className={`ml-auto text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 ${st.cls}`}>
                        {st.text}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 ml-13">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase">Scadenza</span>
                        <p className="text-xs text-slate-600">{card.expiry}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase">Intestatario</span>
                        <p className="text-xs text-slate-600">{card.account.user.nome} {card.account.user.cognome}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase">Email</span>
                        <p className="text-xs text-slate-600">{card.account.user.email}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase">IBAN</span>
                        <p className="text-xs font-mono text-slate-600">{card.account.iban}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase">Saldo</span>
                        <p className="text-sm font-black text-primary">{card.account.balance.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase">Stato conto</span>
                        <p className={`text-[11px] font-black ${accSt.cls} inline-block px-2 py-0.5 rounded-full`}>{accSt.text}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {card.status === 'ACTIVE' && (
                      <button
                        onClick={() => setConfirm({ type: 'freeze', card })}
                        disabled={actionLoading !== null}
                        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-black hover:bg-blue-100 transition-colors"
                      >
                        <Ban size={14} />
                        Congela
                      </button>
                    )}
                    {card.status === 'FROZEN' && (
                      <button
                        onClick={() => setConfirm({ type: 'unfreeze', card })}
                        disabled={actionLoading !== null}
                        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-black hover:bg-emerald-100 transition-colors"
                      >
                        <Unlock size={14} />
                        Scongela
                      </button>
                    )}
                    {card.status !== 'EXPIRED' && (
                      <button
                        onClick={() => setConfirm({ type: 'expire', card })}
                        disabled={actionLoading !== null}
                        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-xs font-black hover:bg-amber-100 transition-colors"
                      >
                        <Clock size={14} />
                        Segna scaduta
                      </button>
                    )}
                    {card.status === 'EXPIRED' && (
                      <button
                        onClick={() => setConfirm({ type: 'reactivate', card })}
                        disabled={actionLoading !== null}
                        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-black hover:bg-emerald-100 transition-colors"
                      >
                        <RotateCcw size={14} />
                        Riattiva
                      </button>
                    )}
                    <button
                      onClick={() => setConfirm({ type: 'delete', card })}
                      disabled={actionLoading !== null}
                      className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-black hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} />
                      Elimina
                    </button>
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
          confirm?.type === 'freeze' ? 'Congelare la carta?' :
          confirm?.type === 'unfreeze' ? 'Scongelare la carta?' :
          confirm?.type === 'expire' ? 'Segnare la carta come scaduta?' :
          confirm?.type === 'reactivate' ? 'Riattivare la carta?' :
          'Eliminare la carta definitivamente?'
        }
        message={
          confirm?.type === 'delete'
            ? `Questa azione è irreversibile. La carta di ${confirm?.card.holder} verrà eliminata permanentemente.`
            : confirm?.type === 'freeze'
            ? `La carta ${confirm?.card.number} verrà congelata. Il cliente non potrà utilizzarla.`
            : confirm?.type === 'unfreeze'
            ? `La carta ${confirm?.card.number} verrà riattivata.`
            : confirm?.type === 'expire'
            ? `La carta ${confirm?.card.number} verrà segnata come scaduta.`
            : `La carta ${confirm?.card.number} verrà riattivata e tornerà operativa.`
        }
        confirmLabel={
          confirm?.type === 'freeze' ? 'Congela' :
          confirm?.type === 'unfreeze' ? 'Scongela' :
          confirm?.type === 'expire' ? 'Segna scaduta' :
          confirm?.type === 'reactivate' ? 'Riattiva' :
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
