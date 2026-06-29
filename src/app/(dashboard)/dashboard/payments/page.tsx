'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth-client';
import {
  Send,
  Clock,
  CheckCircle2,
  Info,
  Loader2,
  Lock,
} from 'lucide-react';
import { csrfFetch } from '@/lib/csrf-client';
import ConfirmModal from '@/components/ConfirmModal';
import AmountInput from '@/components/AmountInput';

interface UserData {
  nome: string;
  cognome: string;
  email: string;
  accounts: {
    id: string;
    iban: string;
    balance: number;
    status: string;
    transactions: {
      id: string;
      type: string;
      amount: number;
      description: string;
      status: string;
      createdAt: string;
    }[];
  }[];
}

export default function PaymentsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAmount, setConfirmAmount] = useState(0);

  const [form, setForm] = useState({
    iban: '',
    amount: 0,
    description: '',
  });

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

  const account = user?.accounts?.[0];
  const balance = account?.balance ?? 0;
  const transactions = account?.transactions ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.iban || !form.amount || !form.description) {
      setError('Compila tutti i campi obbligatori.');
      return;
    }

    if (form.amount <= 0) {
      setError('Importo non valido.');
      return;
    }

    if (form.amount > balance) {
      setError('Fondi insufficienti.');
      return;
    }

    setConfirmAmount(form.amount);
    setConfirmOpen(true);
  };

  const executeSubmit = async () => {
    setSubmitting(true);
    setError('');
    setConfirmOpen(false);

    try {
      const res = await csrfFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          accountId: account?.id,
          type: 'TRANSFER_OUT',
          amount: confirmAmount,
          description: form.description,
          toIban: form.iban,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setForm({ iban: '', amount: 0, description: '' });
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || 'Errore durante l\'invio.');
      }
    } catch {
      setError('Errore di connessione.');
    } finally {
      setSubmitting(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-secondary" />
      </div>
    );
  }

  const isRestricted = account?.status === 'PENDING' || account?.status === 'FROZEN';

  if (isRestricted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${account?.status === 'PENDING' ? 'bg-amber-50' : 'bg-blue-50'}`}>
            {account?.status === 'PENDING' ? <Clock size={28} className="text-amber-500" /> : <Lock size={28} className="text-blue-500" />}
          </div>
          <h2 className="text-lg font-black text-primary mb-2">
            {account?.status === 'PENDING' ? 'Conto in attesa di validazione' : 'Conto congelato'}
          </h2>
          <p className="text-sm text-slate-500">
            {account?.status === 'PENDING'
              ? 'Non è possibile effettuare trasferimenti fino a quando il conto non verrà validato.'
              : 'Il tuo conto è congelato. Contatta il supporto per maggiori informazioni.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-primary">Pagamenti e Trasferimenti</h1>
        <p className="text-sm text-slate-500 mt-1">Gestisci i tuoi trasferimenti in modo semplice e sicuro.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Transfer Form */}
        <section className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h2 className="text-sm font-black text-primary mb-5 flex items-center gap-2">
              <Send size={16} className="text-secondary" />
              Nuovo Trasferimento
            </h2>

            {error && (
              <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm font-black text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div role="status" className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-black text-emerald-600 flex items-center gap-2">
                <CheckCircle2 size={16} />
                Trasferimento inviato! In attesa di approvazione.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5">
                {/* Sender account */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Conto mittente</label>
                  <select className="field-shell" disabled>
                    <option>Conto Personale •• {account?.iban?.slice(-4) ?? '—'} ({formatAmount(balance)} €)</option>
                  </select>
                </div>

                {/* IBAN */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">IBAN destinatario *</label>
                  <input
                    type="text"
                    value={form.iban}
                    onChange={(e) => setForm({ ...form, iban: e.target.value })}
                    placeholder="IT00 A000 0000 0000 0000 0000 000"
                    required
                    className="field-shell"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Importo *</label>
                  <AmountInput
                    value={form.amount}
                    onChange={(val) => setForm({ ...form, amount: val })}
                    max={balance}
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Reference */}
              <div className="space-y-1.5">
                <label htmlFor="payment-desc" className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Causale *</label>
                <input
                  id="payment-desc"
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Fattura / Pagamento servizi"
                  required
                  className="field-shell"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <p className="text-[11px] text-slate-400">
                  Il trasferimento sarà in attesa di approvazione amministrativa.
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto btn-cyan px-8 py-3 text-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Elaborazione...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 size={16} />
                      Inviato
                    </>
                  ) : (
                    <>
                      Invia Trasferimento
                      <Send size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Recent Transfers */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-xs font-black text-primary uppercase tracking-wider">Transazioni Recenti</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-slate-400">Nessuna transazione recente</p>
                </div>
              ) : (
                transactions.slice(0, 5).map((tx) => {
                  const isCredit = tx.type === 'CREDIT' || tx.type === 'TRANSFER_IN';
                  return (
                    <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                          isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Send size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-primary truncate">{tx.description}</p>
                          <p className="text-[11px] text-slate-400">{formatTime(tx.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-black ${isCredit ? 'text-emerald-600' : 'text-primary'}`}>
                          {isCredit ? '+' : '-'}{formatAmount(tx.amount)} €
                        </p>
                        {tx.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-amber-600">
                            <Clock size={8} /> In attesa
                          </span>
                        ) : tx.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-emerald-600">
                            <CheckCircle2 size={8} /> OK
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
        </section>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-4">
          {/* Balance */}
          <div className="bg-primary rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} aria-hidden />
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-xs font-black text-secondary uppercase tracking-wider">Saldo Disponibile</h3>
                <Info size={14} className="text-white/40" />
              </div>
              <div>
                <p className="text-3xl font-black">{formatAmount(balance)} €</p>
              </div>
              <p className="text-[11px] text-white/40">
                I fondi sono soggetti ad approvazione per prelievi e trasferimenti.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Confermare il trasferimento?"
        message={`Stai per inviare ${confirmAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} € all'IBAN ${form.iban}. L'operazione sarà in attesa di approvazione amministrativa.`}
        confirmLabel="Conferma Invio"
        variant="info"
        loading={submitting}
        onConfirm={executeSubmit}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
