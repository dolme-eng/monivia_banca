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
  Pencil,
  Lock,
  KeyRound,
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
  user: {
    id: string;
    email: string;
    nome: string;
    cognome: string;
    failedAttempts: number;
    lockedUntil: string | null;
  };
  cards: { number: string; holder: string }[];
}

type ConfirmAction = {
  type: 'validate' | 'freeze' | 'unfreeze' | 'block' | 'unblock' | 'close' | 'purge' | 'unlockLogin';
  account: Account;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [purgeIban, setPurgeIban] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingIban, setEditingIban] = useState<{ id: string; value: string } | null>(null);
  const [ibanSaving, setIbanSaving] = useState(false);
  const [ibanError, setIbanError] = useState<string | null>(null);
  const [pwTarget, setPwTarget] = useState<Account | null>(null);
  const [pwValue, setPwValue] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery.trim().length >= 2) params.set('q', debouncedQuery.trim());
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/admin/accounts?${params.toString()}`);
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filterStatus]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Reads the server's refusal and surfaces it. Without this the `if (res.ok)`
  // branches below silently swallowed every 400/403/409: the modal closed, the
  // list did not change, no message appeared, and the admin concluded the action
  // had succeeded. On `purge` that meant believing an account had been erased.
  const reportFailure = async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      setActionError(data?.error || fallback);
    } catch {
      setActionError(fallback);
    }
  };

  const handleAction = async (action: ConfirmAction) => {
    setActionLoading(action.type);
    setActionError(null);
    try {
      if (action.type === 'close' || action.type === 'purge') {
        const res = await csrfFetch(`/api/admin/accounts/${action.account.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: action.type,
            ...(action.type === 'purge' ? { confirmIban: purgeIban } : {}),
          }),
        });
        if (res.ok) {
          if (action.type === 'purge') {
            setAccounts((prev) => prev.filter((a) => a.id !== action.account.id));
          } else {
            setAccounts((prev) =>
              prev.map((a) =>
                a.id === action.account.id
                  ? { ...a, status: 'CLOSED', blockedAt: new Date().toISOString() }
                  : a
              )
            );
          }
        } else {
          await reportFailure(res, 'Impossibile completare l\'operazione.');
        }
      } else if (action.type === 'unlockLogin') {
        const res = await csrfFetch(`/api/admin/accounts/${action.account.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'unlockLogin' }),
        });
        if (res.ok) {
          setAccounts((prev) =>
            prev.map((a) =>
              a.id === action.account.id
                ? {
                    ...a,
                    user: { ...a.user, failedAttempts: 0, lockedUntil: null },
                  }
                : a
            )
          );
        } else {
          await reportFailure(res, 'Impossibile sbloccare l\'accesso.');
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
        } else {
          await reportFailure(res, 'Impossibile completare l\'operazione.');
        }
      }
    } catch {
      setActionError('Errore durante l\'esecuzione dell\'azione.');
    } finally {
      setActionLoading(null);
      setConfirm(null);
    }
  };

  const saveIban = async () => {
    if (!editingIban || ibanSaving) return;
    // Normalize like the server does: uppercase, no spaces/dashes
    const normalized = editingIban.value.replace(/[\s-]/g, '').toUpperCase();
    setEditingIban({ ...editingIban, value: normalized });
    setIbanSaving(true);
    setIbanError(null);
    try {
      const res = await csrfFetch(`/api/admin/accounts/${editingIban.id}/iban`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iban: normalized }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAccounts((prev) =>
          prev.map((a) => (a.id === editingIban.id ? { ...a, iban: data.account.iban } : a))
        );
        setEditingIban(null);
      } else {
        setIbanError(data.error || 'Impossibile aggiornare l\'IBAN.');
      }
    } catch {
      setIbanError('Errore di connessione.');
    } finally {
      setIbanSaving(false);
    }
  };

  const pwChecks = [
    { label: '8+ caratteri', ok: pwValue.length >= 8 },
    { label: 'Maiuscola', ok: /[A-Z]/.test(pwValue) },
    { label: 'Minuscola', ok: /[a-z]/.test(pwValue) },
    { label: 'Numero', ok: /[0-9]/.test(pwValue) },
    { label: 'Speciale', ok: /[^A-Za-z0-9]/.test(pwValue) },
  ];
  const pwValid = pwChecks.every((c) => c.ok);

  const savePassword = async () => {
    if (!pwTarget || pwSaving || !pwValid) return;
    setPwSaving(true);
    setPwError(null);
    try {
      const res = await csrfFetch(`/api/admin/accounts/${pwTarget.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwValue }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPwDone(true);
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === pwTarget.id
              ? { ...a, user: { ...a.user, failedAttempts: 0, lockedUntil: null } }
              : a
          )
        );
      } else {
        setPwError(data.error || 'Impossibile aggiornare la password.');
      }
    } catch {
      setPwError('Errore di connessione.');
    } finally {
      setPwSaving(false);
    }
  };

  const closePasswordModal = () => {
    setPwTarget(null);
    setPwValue('');
    setPwError(null);
    setPwDone(false);
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
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              id="admin-accounts-search"
              type="search"
              role="searchbox"
              aria-label="Cerca un conto per nome, email o IBAN"
              placeholder="Cerca per nome, email o IBAN…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm rounded-lg border border-slate-200 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
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
          <p className="text-sm text-slate-600">Nessun conto trovato</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => {
            const st = statusLabel(acc.status);
            const loginLocked = !!acc.user.lockedUntil && new Date(acc.user.lockedUntil) > new Date();
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
                        <p className="text-[11px] text-slate-600 truncate">{acc.user.email}</p>
                      </div>
                      <div className="ml-auto flex items-center gap-2 shrink-0">
                        {loginLocked && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                            <Lock size={10} />
                            Accesso bloccato
                          </span>
                        )}
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${st.cls}`}>
                          {st.text}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 ml-14">
                      <div>
                        <span className="text-[10px] text-slate-600 uppercase">IBAN</span>
                        {editingIban && editingIban.id === acc.id ? (
                          <div className="mt-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingIban.value}
                                onChange={(e) => setEditingIban({ id: editingIban.id, value: e.target.value.toUpperCase() })}
                                placeholder="IT00…"
                                spellCheck={false}
                                autoComplete="off"
                                className="w-64 max-w-full px-2 py-2 min-h-[44px] text-xs font-mono rounded-lg border border-secondary focus:ring-1 focus:ring-secondary outline-none"
                              />
                              <button
                                onClick={saveIban}
                                disabled={ibanSaving}
                                className="px-3 py-2 min-h-[44px] bg-emerald-600 text-white rounded-lg text-xs font-black hover:bg-emerald-700 transition-colors disabled:opacity-50"
                              >
                                {ibanSaving ? <Loader2 size={14} className="animate-spin" /> : 'Salva'}
                              </button>
                              <button
                                onClick={() => { setEditingIban(null); setIbanError(null); }}
                                disabled={ibanSaving}
                                className="px-3 py-2 min-h-[44px] bg-slate-100 text-slate-500 rounded-lg text-xs font-black hover:bg-slate-200 transition-colors"
                              >
                                Annulla
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1">
                              Formato: IT + 2 cifre di controllo + 23 caratteri
                              (<span className={editingIban.value.replace(/[\s-]/g, '').length === 27 ? 'text-emerald-600 font-black' : ''}>
                                {editingIban.value.replace(/[\s-]/g, '').length}/27
                              </span>)
                            </p>
                            {ibanError && (
                              <p role="alert" className="text-[11px] font-black text-red-500 mt-1">{ibanError}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs font-mono text-slate-600">{acc.iban}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-600 uppercase">Saldo</span>
                        <p className="text-sm font-black text-primary">{formatAmount(acc.balance)} €</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-600 uppercase">Carta</span>
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
                    {loginLocked && (
                      <button
                        onClick={() => setConfirm({ type: 'unlockLogin', account: acc })}
                        disabled={actionLoading !== null}
                        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-black hover:bg-red-100 transition-colors"
                      >
                        <Unlock size={14} />
                        Sblocca accesso
                      </button>
                    )}
                    <button
                      onClick={() => { setPwTarget(acc); setPwValue(''); setPwError(null); setPwDone(false); }}
                      disabled={actionLoading !== null}
                      className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-200 transition-colors"
                    >
                      <KeyRound size={14} />
                      Reimposta password
                    </button>
                    <button
                      onClick={() => { setEditingIban({ id: acc.id, value: acc.iban }); setIbanError(null); }}
                      disabled={actionLoading !== null}
                      className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-200 transition-colors"
                    >
                      <Pencil size={14} />
                      Modifica IBAN
                    </button>
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
                          onClick={() => setConfirm({ type: 'close', account: acc })}
                          disabled={actionLoading !== null}
                          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-black hover:bg-slate-100 transition-colors"
                        >
                          <Lock size={14} />
                          Chiudi conto
                        </button>
                        <button
                          onClick={() => { setPurgeIban(''); setConfirm({ type: 'purge', account: acc }); }}
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

      {/* Admin-set client password */}
      {pwTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !pwSaving && closePasswordModal()} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pw-modal-title"
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <button
              onClick={closePasswordModal}
              disabled={pwSaving}
              aria-label="Chiudi"
              className="absolute right-3 top-3 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <XCircle size={16} />
            </button>

            <h3 id="pw-modal-title" className="text-lg font-black text-primary mb-1">
              {pwDone ? 'Password aggiornata' : 'Reimposta password'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              {pwTarget.user.nome} {pwTarget.user.cognome} · {pwTarget.user.email}
            </p>

            {pwDone ? (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-black text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Password aggiornata e sessioni chiuse.
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <p className="font-black mb-1">Comunica la password al cliente</p>
                  <p>
                    Non viene salvata né mostrata di nuovo. Trasmettila con un canale sicuro
                    e chiedi di cambiarla al primo accesso.
                  </p>
                </div>
                <button onClick={closePasswordModal} className="w-full btn-primary py-3 text-sm">
                  Chiudi
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="admin-pw" className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 mb-1">
                    Nuova password *
                  </label>
                  <input
                    id="admin-pw"
                    type="text"
                    value={pwValue}
                    onChange={(e) => setPwValue(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                    placeholder="Es. Marco453_34"
                  />
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {pwChecks.map((c) => (
                      <span key={c.label} className={`text-[11px] font-semibold ${c.ok ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {c.ok ? '✓' : '○'} {c.label}
                      </span>
                    ))}
                  </div>
                </div>

                {pwError && (
                  <p role="alert" className="text-sm font-black text-red-600">{pwError}</p>
                )}

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  Verranno anche azzerati i tentativi falliti e chiuse tutte le sessioni attive.
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closePasswordModal}
                    disabled={pwSaving}
                    className="flex-1 px-4 py-3 min-h-[44px] rounded-xl border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={savePassword}
                    disabled={pwSaving || !pwValid}
                    className="flex-1 px-4 py-3 min-h-[44px] rounded-xl text-sm font-black text-white bg-primary hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {pwSaving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                    Salva
                  </button>
                </div>
              </div>
            )}
          </div>
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
          confirm?.type === 'unlockLogin' ? 'Sbloccare l\'accesso?' :
          confirm?.type === 'close' ? 'Chiudere il conto?' :
          'Eliminare definitivamente tutti i dati del cliente?'
        }
        message={
          confirm?.type === 'purge'
            ? `STORIA E ANAGRAFICA DISTRUTTE. Verranno eliminati per sempre conto, carte, ${confirm?.account.user.nome} ${confirm?.account.user.cognome} e ogni movimento. Consentito solo se il saldo è 0 e non ci sono movimenti da 10 anni (obbligo di conservazione).`
            : confirm?.type === 'close'
            ? `Il conto di ${confirm?.account.user.nome} ${confirm?.account.user.cognome} verrà chiuso: carte congelate, trasferimenti bloccati, sessioni e inviti revocati. I movimenti e i dati anagrafici restano conservati per gli obblighi di legge.`
            : confirm?.type === 'unlockLogin'
            ? `${confirm?.account.user.nome} ${confirm?.account.user.cognome} potrà riprovare ad accedere immediatamente. Il contatore dei tentativi falliti verrà azzerato.`
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
          confirm?.type === 'unlockLogin' ? 'Sblocca accesso' :
          confirm?.type === 'close' ? 'Chiudi conto' :
          'Elimina per sempre'
        }
        variant={confirm?.type === 'purge' ? 'danger' : 'info'}
        loading={actionLoading !== null}
        requireTyped={confirm?.type === 'purge' ? confirm?.account.iban : undefined}
        expected={confirm?.account.iban}
        onTypedChange={setPurgeIban}
        onConfirm={() => confirm && handleAction(confirm)}
        onCancel={() => { setConfirm(null); setPurgeIban(''); }}
      />
    </div>
  );
}
