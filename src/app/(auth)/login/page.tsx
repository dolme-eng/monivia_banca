'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError('Credenziali non valide. Riprova.');
        setLoading(false);
      } else {
        if (data.role === 'ADMIN') {
          window.location.href = '/admin/dashboard';
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch {
      setError('Errore di connessione. Riprova.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ===== Login Form ===== */}
      <main className="w-full flex flex-col justify-center px-6 md:px-10 xl:px-16 py-12 bg-white z-10 relative">
        <div className="max-w-md w-full mx-auto">
          {/* Branding */}
          <div className="mb-8">
            <Link href="/" className="inline-block">
              <span className="text-2xl font-black tracking-tight text-primary">
                MO<span className="text-secondary">NIVIA</span>
              </span>
              <span className="relative -top-2.5 ml-0.5 text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
                Banca
              </span>
            </Link>
            <p className="text-sm text-slate-500 mt-3">
              Accedi al tuo conto bancario personale in sicurezza.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm font-black text-red-600 text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 ml-1">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="nome@email.com"
                  className="field-shell pl-12"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 ml-1">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="field-shell pl-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-cyan px-6 py-4 text-sm"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Verifica in corso...
                </>
              ) : (
                <>
                  Accedi
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Secondary Action */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">Non hai ancora un conto?</p>
            <Link
              href="https://www.monivia.it"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm text-primary font-black hover:text-secondary transition-colors underline underline-offset-4"
            >
              Richiedi un prestito su Monivia
            </Link>
          </div>

          {/* Footer */}
          <footer className="mt-16 pt-6 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              © 2026 Monivia S.r.l. — P.IVA 10984760583 — OAM n. A23741
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
