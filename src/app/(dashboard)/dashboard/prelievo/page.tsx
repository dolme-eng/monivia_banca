'use client';

import { useState, useEffect } from 'react';
import {
  ArrowDownToLine,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wallet,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { csrfFetch } from '@/lib/csrf-client';
import ConfirmModal from '@/components/ConfirmModal';
import AmountInput from '@/components/AmountInput';

interface Account {
  id: string;
  iban: string;
  balance: number;
  user: { nome: string; cognome: string };
}

interface RecentPrelievo {
  id: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

export default function PrelievoPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [recentPrelievi, setRecentPrelievi] = useState<RecentPrelievo[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const res = await fetch('/api/user/account');
        if (res.status === 401) {
          window.location.replace('/login');
          return;
        }
        const data = await res.json();
        if (data.success && data.user?.accounts?.[0]) {
          const acc = data.user.accounts[0];
          setAccount({ id: acc.id, iban: acc.iban, balance: acc.balance, user: { nome: data.user.nome, cognome: data.user.cognome } });
        } else {
          setError('Impossibile caricare i dati del conto.');
        }
      } catch {
        setError('Errore di connessione.');
      } finally {
        setLoadingAccount(false);
      }
    };
    fetchAccount();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (amount <= 0) {
      setError('Inserisci un importo valido.');
      return;
    }

    if (!description.trim()) {
      setError('Inserisci una descrizione.');
      return;
    }

    if (account && amount > account.balance) {
      setError('Fondi insufficienti.');
      return;
    }

    setConfirmOpen(true);
  };

  const executeSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    setConfirmOpen(false);

    try {
      const res = await csrfFetch('/api/prelievo', {
        method: 'POST',
        body: JSON.stringify({
          accountId: account?.id || 'demo',
          amount,
          description,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setRecentPrelievi((prev) => [
          {
            id: data.transaction.id,
            amount: -amount,
            description,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        setAmount(0);
        setDescription('');
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || 'Errore durante la richiesta');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  if (loadingAccount) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-black text-red-600">
          {error}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-primary">Prelievo</h1>
        <p className="text-sm text-slate-500 mt-1">
          Richiedi un prelievo dal tuo conto. Sarà confermato dall&apos;amministrazione.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form */}
        <section className="lg:col-span-7">
          <div className="bg-white border border-slate-200/80 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            {/* Account summary */}
            {account && (
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                  <Wallet size={20} className="text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Il mio conto</p>
                  <p className="text-sm font-black text-primary truncate">{account.iban}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Saldo</p>
                  <p className="text-lg font-black text-primary">{account.balance.toLocaleString('it-IT')} €</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Amount */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 ml-1">
                  Importo da prelevare *
                </label>
                <AmountInput
                  value={amount}
                  onChange={setAmount}
                  max={account?.balance || 999999}
                  disabled={loading}
                />
              </div>

              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((qa) => (
                  <button
                    key={qa}
                    type="button"
                    onClick={() => setAmount(qa)}
                    className={`px-3 py-3 rounded-lg text-xs font-black transition-all min-h-[44px] ${
                      amount === qa
                        ? 'bg-secondary text-primary'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {qa.toLocaleString('it-IT')} €
                  </button>
                ))}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 ml-1">
                  Descrizione *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Es: Prelievo per spese personali"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-sm font-medium text-primary focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Ogni prelievo deve essere approvato dall&apos;amministrazione. Il tempo di elaborazione è di circa 1-2 ore lavorative.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle size={14} className="text-red-500" />
                  <span className="text-xs text-red-600">{error}</span>
                </div>
              )}

              {/* Success */}
              {success && (
                <div role="status" className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-xs text-emerald-600">Richiesta inviata con successo!</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || amount <= 0 || !account}
                className="w-full btn-cyan py-4 text-sm"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    Richiedi Prelievo
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="lg:col-span-5 space-y-4">
          {/* Balance card */}
          <div className="bg-primary rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} aria-hidden />
            <div className="relative z-10">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary mb-1">Saldo Disponibile</p>
              <p className="text-3xl font-black tracking-tight">{account?.balance.toLocaleString('it-IT') || '0'} €</p>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-[11px] text-white/50">Ultimo prelievo</p>
                <p className="text-sm font-black mt-0.5">22 Giu 2026 — 2.000 €</p>
              </div>
            </div>
          </div>

          {/* Recent prelievi */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4">Richieste Recenti</h3>
            {recentPrelievi.length === 0 ? (
              <div className="text-center py-6">
                <Clock size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Nessuna richiesta recente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPrelievi.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ArrowDownToLine size={14} className="text-secondary" />
                      <div>
                        <p className="text-xs font-black text-primary">{p.description}</p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(p.createdAt).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-amber-600">
                      <Clock size={8} /> In sospeso
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4">Come funziona</h3>
            <div className="space-y-3">
              {[
                { step: '1', text: 'Inserisci l\'importo e la descrizione' },
                { step: '2', text: 'L\'amministrazione riceve la notifica' },
                { step: '3', text: 'Il prelievo viene confermato e i fondi accreditati' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-[11px] font-black shrink-0">
                    {step}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Confermare il prelievo?"
        message={`Stai per richiedere un prelievo di ${amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €. La richiesta sarà inviata all'amministrazione per l'approvazione.`}
        confirmLabel="Conferma Prelievo"
        variant="warning"
        loading={loading}
        onConfirm={executeSubmit}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
