'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { csrfFetch } from '@/lib/csrf-client';

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Token is validated on submit, not on load (to prevent token scanning)
    setTokenValid(!!token);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Le password non coincidono.');
      return;
    }

    setLoading(true);
    try {
      const res = await csrfFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setError(data.error || 'Errore durante il ripristino.');
      }
    } catch {
      setError('Errore di connessione.');
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) return null;

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
          <h1 className="text-xl font-black text-primary">Reimposta Password</h1>
          <p className="text-sm text-slate-500 mt-1">
            Inserisci la tua nuova password.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h2 className="text-lg font-black text-primary mb-2">Password aggiornata</h2>
              <p className="text-sm text-slate-500 mb-6">
                La tua password è stata reimpostata con successo. Verrai reindirizzato al login...
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl text-sm font-black hover:bg-slate-800 transition-colors"
              >
                Vai al Login
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
                  Nuova password *
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    className="w-full pl-10 pr-10 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                    placeholder="Minimo 8 caratteri"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Nascondi' : 'Mostra'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Conferma password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                  placeholder="Ripeti la password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl text-sm font-black hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                {loading ? 'Aggiornamento...' : 'Reimposta Password'}
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
