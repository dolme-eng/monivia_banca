'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { csrfFetch } from '@/lib/csrf-client';

export default function ProvisionPage() {
  const [formData, setFormData] = useState({
    email: '',
    nome: '',
    cognome: '',
    amount: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await csrfFetch('/api/accounts/provision', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Errore durante il provisioning');
      }
    } catch {
      setError('Errore di connessione. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
        <h2 className="section-heading">Provisionamento <span className="text-gradient-cyan">del Prestito</span></h2>
        <p className="section-copy mt-5">
          Crea il conto bancario del cliente e accredita l&apos;importo del prestito approvato.
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-5">
        <form onSubmit={handleSubmit} className="lg:col-span-3">
          <div className="surface-card p-6 sm:p-8">
            <div className="mb-6">
              <h3 className="text-xl font-black text-primary">Informazioni del cliente</h3>
              <p className="mt-1 text-sm text-slate-500">
                Inserisci i dati ricevuti via email o WhatsApp.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    className="field-shell"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-2 block ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Cognome *
                  </label>
                  <input
                    type="text"
                    required
                    className="field-shell"
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Email del richiedente *
                </label>
                <input
                  type="email"
                  required
                  className="field-shell"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-2 block ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Password per l&apos;accesso *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="field-shell pr-10"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimo 6 caratteri"
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
                <label className="mb-2 block ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Importo del prestito approvato (€) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  className="field-shell text-2xl font-black"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full sm:w-auto px-8"
              >
                {loading ? 'Elaborazione in corso...' : 'Crea il conto e accredita'}
              </button>
            </div>
          </div>
        </form>

        <div className="lg:col-span-2 space-y-6">
          <div className="surface-card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-black text-primary">
              <AlertCircle size={18} className="text-secondary" />
              Istruzioni
            </h3>
            <ul className="space-y-3 text-sm text-slate-500">
              <li className="flex gap-2">
                <span className="text-secondary font-black">•</span>
                Verifica l&apos;identità del cliente via WhatsApp o email.
              </li>
              <li className="flex gap-2">
                <span className="text-secondary font-black">•</span>
                Inserisci esattamente l&apos;email utilizzata per la richiesta.
              </li>
              <li className="flex gap-2">
                <span className="text-secondary font-black">•</span>
                Imposta una password sicura per l&apos;accesso del cliente.
              </li>
              <li className="flex gap-2">
                <span className="text-secondary font-black">•</span>
                L&apos;accredito è istantaneo e il conto viene creato immediatamente.
              </li>
              <li className="flex gap-2">
                <span className="text-secondary font-black">•</span>
                Le credenziali verranno mostrate qui sotto per l&apos;invio al cliente.
              </li>
            </ul>
          </div>

          {result && result.success && (
            <div className="surface-card p-6 border-l-4 border-emerald-500">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-500" />
                <h3 className="font-black text-primary">Conto creato</h3>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">IBAN</p>
                  <p className="mt-1 font-mono text-sm font-bold text-primary">{result.account.iban}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo iniziale</p>
                  <p className="mt-1 text-lg font-black text-primary">{result.account.balance} €</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carta bancaria</p>
                  <p className="mt-1 font-mono text-sm font-bold text-primary">{result.card.number}</p>
                  <p className="text-xs text-slate-500">{result.card.holder}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</p>
                  <p className="mt-1 text-sm font-bold text-primary">{formData.password}</p>
                </div>
              </div>
              <p className="mt-4 text-xs italic text-slate-400">
                Invia queste credenziali al cliente via email o WhatsApp.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
