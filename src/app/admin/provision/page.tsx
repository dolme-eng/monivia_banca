'use client';

import { useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Eye, EyeOff, Search, ArrowUpCircle, CreditCard, Banknote, User } from 'lucide-react';
import { csrfFetch } from '@/lib/csrf-client';
import ConfirmModal from '@/components/ConfirmModal';

interface FoundAccount {
  id: string;
  iban: string;
  balance: number;
  currency: string;
  status: string;
  createdAt: string;
  user: { id: string; email: string; nome: string; cognome: string };
  cards: { number: string; holder: string }[];
}

export default function ProvisionPage() {
  const [tab, setTab] = useState<'search' | 'create'>('search');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoundAccount[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState<FoundAccount | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupResult, setTopupResult] = useState<any>(null);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [topupConfirmOpen, setTopupConfirmOpen] = useState(false);

  const [formData, setFormData] = useState({ email: '', nome: '', cognome: '', amount: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [createResult, setCreateResult] = useState<any>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);

  const doSearch = useCallback(async () => {
    if (searchQuery.trim().length < 2) return;
    setSearchLoading(true);
    setSearchDone(false);
    try {
      const res = await fetch(`/api/admin/accounts?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      setSearchResults(data.accounts || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
      setSearchDone(true);
    }
  }, [searchQuery]);

  const executeTopup = async () => {
    if (!selectedAccount || !topupAmount) return;
    setTopupLoading(true);
    setTopupError(null);
    setTopupResult(null);
    setTopupConfirmOpen(false);
    try {
      const res = await csrfFetch('/api/admin/accounts/topup', {
        method: 'POST',
        body: JSON.stringify({ accountId: selectedAccount.id, amount: Number(topupAmount) }),
      });
      const data = await res.json();
      if (data.success) {
        setTopupResult(data);
        setSearchResults((prev) =>
          prev.map((a) =>
            a.id === selectedAccount.id
              ? { ...a, balance: data.account.balance }
              : a
          )
        );
        setSelectedAccount({ ...selectedAccount, balance: data.account.balance });
      } else {
        setTopupError(data.error || "Errore durante l'accredito");
      }
    } catch {
      setTopupError('Errore di connessione. Riprova più tardi.');
    } finally {
      setTopupLoading(false);
    }
  };

  const executeCreate = async () => {
    setCreateLoading(true);
    setCreateError(null);
    setCreateResult(null);
    setCreateConfirmOpen(false);
    try {
      const res = await csrfFetch('/api/accounts/provision', {
        method: 'POST',
        body: JSON.stringify({ ...formData, amount: Number(formData.amount) }),
      });
      const data = await res.json();
      if (data.success) {
        setCreateResult(data);
        setFormData({ email: '', nome: '', cognome: '', amount: '', password: '' });
      } else {
        setCreateError(data.error || 'Errore durante il provisioning');
      }
    } catch {
      setCreateError('Errore di connessione. Riprova più tardi.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div>
      <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
        <h2 className="section-heading">Gestione <span className="text-gradient-cyan">Prestiti</span></h2>
        <p className="section-copy mt-5">
          Cerca un conto esistente per accreditare un nuovo prestito, oppure crea un nuovo conto.
        </p>
      </div>

      <div className="mx-auto max-w-4xl">
        {/* Tabs */}
        <div className="mb-8 flex gap-2">
          <button
            onClick={() => setTab('search')}
            className={`flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-black transition-all ${
              tab === 'search'
                ? 'bg-primary text-white shadow-lg'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Search size={16} />
            Cerca Conto
          </button>
          <button
            onClick={() => setTab('create')}
            className={`flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-black transition-all ${
              tab === 'create'
                ? 'bg-primary text-white shadow-lg'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <CreditCard size={16} />
            Nuovo Conto
          </button>
        </div>

        {/* ── TAB: Search + Top-up ── */}
        {tab === 'search' && (
          <div className="space-y-6">
            {/* Search bar */}
            <div className="surface-card p-6">
              <h3 className="mb-4 font-black text-primary">Cerca un cliente</h3>
              <p className="mb-4 text-sm text-slate-500">
                Cerca per email, nome, cognome o IBAN.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  className="field-shell flex-1"
                  placeholder="es. mario.rossi@email.it"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                />
                <button
                  onClick={doSearch}
                  disabled={searchLoading || searchQuery.trim().length < 2}
                  className="btn-primary px-6"
                >
                  {searchLoading ? 'Ricerca...' : 'Cerca'}
                </button>
              </div>
            </div>

            {/* Results */}
            {searchDone && (
              <div className="surface-card p-6">
                {searchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <User size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Nessun conto trovato per &ldquo;{searchQuery}&rdquo;</p>
                    <p className="text-xs text-slate-400 mt-1">Prova con un&apos;altra ricerca o crea un nuovo conto.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">{searchResults.length} conto{searchResults.length !== 1 ? 'i' : ''} trovato{searchResults.length !== 1 ? 'i' : ''}</p>
                    {searchResults.map((account) => (
                      <div
                        key={account.id}
                        className={`rounded-xl border p-4 transition-all cursor-pointer ${
                          selectedAccount?.id === account.id
                            ? 'border-secondary bg-secondary/5 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                        onClick={() => {
                          setSelectedAccount(selectedAccount?.id === account.id ? null : account);
                          setTopupAmount('');
                          setTopupResult(null);
                          setTopupError(null);
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary shrink-0">
                              {account.user.nome[0]}{account.user.cognome[0]}
                            </div>
                            <div>
                              <p className="text-sm font-black text-primary">
                                {account.user.nome} {account.user.cognome}
                              </p>
                              <p className="text-xs text-slate-400">{account.user.email}</p>
                            </div>
                          </div>
                          <div className="text-right sm:text-right">
                            <p className="text-lg font-black text-primary">
                              {account.balance.toLocaleString('it-IT')} €
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">{account.iban}</p>
                          </div>
                        </div>

                        {/* Expanded: top-up form */}
                        {selectedAccount?.id === account.id && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="space-y-3">
                              {account.cards.length > 0 && (
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <CreditCard size={12} />
                                  Carta: {account.cards[0].number}
                                </div>
                              )}
                              {topupResult && (
                                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2" role="status">
                                  <CheckCircle2 size={14} />
                                  {Number(topupAmount).toLocaleString('it-IT')} € accreditati. Nuovo saldo: {topupResult.account.balance.toLocaleString('it-IT')} €
                                </div>
                              )}
                              {topupError && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2" role="alert">
                                  <AlertCircle size={14} />
                                  {topupError}
                                </div>
                              )}
                              <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Importo da accreditare (€)
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    className="field-shell text-lg font-black"
                                    placeholder="0"
                                    value={topupAmount}
                                    onChange={(e) => { setTopupAmount(e.target.value); setTopupResult(null); setTopupError(null); }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setTopupConfirmOpen(true); }}
                                  disabled={topupLoading || !topupAmount || Number(topupAmount) <= 0}
                                  className="btn-primary px-6 py-3 text-sm whitespace-nowrap"
                                >
                                  <Banknote size={14} className="inline mr-1" />
                                  {topupLoading ? 'Accredito...' : 'Accredita'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Create new account ── */}
        {tab === 'create' && (
          <form
            onSubmit={(e) => { e.preventDefault(); setCreateConfirmOpen(true); }}
            className="space-y-6"
          >
            <div className="surface-card p-6 sm:p-8">
              <div className="mb-6">
                <h3 className="text-xl font-black text-primary">Informazioni del cliente</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Inserisci i dati ricevuti via email o WhatsApp.
                </p>
              </div>

              {createError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2" role="alert">
                  <AlertCircle size={16} />
                  {createError}
                </div>
              )}

              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">Nome *</label>
                    <input type="text" required className="field-shell" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-2 block ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">Cognome *</label>
                    <input type="text" required className="field-shell" value={formData.cognome} onChange={(e) => setFormData({ ...formData, cognome: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">Email del richiedente *</label>
                  <input type="email" required className="field-shell" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label className="mb-2 block ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">Password per l&apos;accesso *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      className="field-shell pr-10"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Minimo 8 caratteri"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">Importo del prestito approvato (€) *</label>
                  <input type="number" required min={1} className="field-shell text-2xl font-black" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <button type="submit" disabled={createLoading} className="btn-primary w-full sm:w-auto px-8">
                  {createLoading ? 'Elaborazione in corso...' : 'Crea il conto e accredita'}
                </button>
              </div>
            </div>

            {/* Success card */}
            {createResult && createResult.success && (
              <div className="surface-card p-6 border-l-4 border-emerald-500" role="status">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  <h3 className="font-black text-primary">
                    {createResult.isNew ? 'Conto creato e accreditato' : 'Conto accreditato'}
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</p>
                    <p className="mt-1 text-sm font-bold text-primary">{formData.email || createResult.account?.email}</p>
                  </div>
                  {createResult.password && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Password</p>
                      <p className="mt-1 font-mono text-sm font-bold text-primary">{createResult.password}</p>
                      <p className="text-[10px] text-amber-600 mt-1">Comunica questa password al cliente via WhatsApp o email.</p>
                    </div>
                  )}
                  {!createResult.password && (
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</p>
                      <p className="mt-1 text-sm font-bold text-primary">Imposta dall&apos;admin</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">IBAN</p>
                    <p className="mt-1 font-mono text-sm font-bold text-primary">{createResult.account.iban}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo attuale</p>
                    <p className="mt-1 text-lg font-black text-primary">{Number(createResult.account.balance).toLocaleString('it-IT')} €</p>
                  </div>
                  {createResult.card && (
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carta bancaria</p>
                      <p className="mt-1 font-mono text-sm font-bold text-primary">{createResult.card.number}</p>
                      <p className="text-xs text-slate-500">{createResult.card.holder}</p>
                    </div>
                  )}
                </div>
                <p className="mt-4 text-xs italic text-slate-400">
                  Invia queste credenziali al cliente via email o WhatsApp.
                </p>
                <button
                  onClick={() => setCreateResult(null)}
                  className="mt-4 w-full btn-primary px-6 py-3 text-sm"
                >
                  Nuovo Provisioning
                </button>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Confirm modals */}
      <ConfirmModal
        open={topupConfirmOpen}
        title="Confermare l'accredito?"
        message={`Stai per accreditare ${Number(topupAmount || 0).toLocaleString('it-IT')} € sul conto di ${selectedAccount?.user.nome} ${selectedAccount?.user.cognome}.`}
        confirmLabel="Accredita"
        variant="info"
        loading={topupLoading}
        onConfirm={executeTopup}
        onCancel={() => setTopupConfirmOpen(false)}
      />
      <ConfirmModal
        open={createConfirmOpen}
        title="Confermare il provisioning?"
        message={`Stai per creare un conto per ${formData.nome} ${formData.cognome} con un accredito di ${Number(formData.amount || 0).toLocaleString('it-IT')} €.`}
        confirmLabel="Conferma"
        variant="info"
        loading={createLoading}
        onConfirm={executeCreate}
        onCancel={() => setCreateConfirmOpen(false)}
      />
    </div>
  );
}
