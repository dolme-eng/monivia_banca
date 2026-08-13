'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { csrfFetch } from '@/lib/csrf-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await csrfFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Errore durante l\'invio.');
      }
    } catch {
      setError('Errore di connessione.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl font-black tracking-tight text-primary">
              MO<span className="text-secondary">NIVIA</span>
            </span>
            <span className="relative -top-2 text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
              Banca
            </span>
          </div>
          <h1 className="text-xl font-black text-primary">Password dimenticata?</h1>
          <p className="text-sm text-slate-500 mt-1">
            Inserisci la tua email e ti invieremo un link per reimpostare la password.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h2 className="text-lg font-black text-primary mb-2">Email inviata</h2>
              <p className="text-sm text-slate-500 mb-6">
                Se l&apos;email <strong>{email}</strong> è associata a un account, riceverai un link per reimpostare la password.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl text-sm font-black hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft size={14} />
                Torna al Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2" role="alert">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Email *
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                    placeholder="la-tua@email.it"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl text-sm font-black hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                {loading ? 'Invio in corso...' : 'Invia Link di Ripristino'}
              </button>
            </form>
          )}
        </div>

        {/* Back to login */}
        {!success && (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} />
            Torna al Login
          </Link>
        )}
      </div>
    </div>
  );
}
