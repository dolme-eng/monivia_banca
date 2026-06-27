'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Clock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
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

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Credenziali non valide. Riprova.');
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* ===== Left: Login Form ===== */}
      <main className="w-full lg:w-[45%] flex flex-col justify-center px-6 md:px-10 xl:px-16 bg-white z-10 relative">
        <div className="max-w-md w-full mx-auto">
          {/* Branding */}
          <div className="mb-8">
            <Link href="/" className="inline-block">
              <span className="text-2xl font-black tracking-tight text-primary">
                MO<span className="text-secondary">NIVIA</span>
              </span>
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-l border-slate-200 pl-2 ml-2">
                Banca
              </span>
            </Link>
            <p className="text-sm text-slate-500 mt-3">
              Accedi al tuo conto bancario personale in sicurezza.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm font-black text-red-600 text-center">
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Utilities */}
            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-secondary focus:ring-secondary/30 transition-all"
                />
                <span className="text-sm text-slate-500 group-hover:text-primary transition-colors">
                  Ricordami
                </span>
              </label>
              <a
                href="#"
                className="text-sm text-secondary hover:text-cyan-400 transition-colors"
              >
                Password dimenticata?
              </a>
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
            <p className="text-[10px] text-slate-400">
              © 2024 Monivia S.r.l. — P.IVA 10984760583 — OAM n. A23741
            </p>
          </footer>
        </div>
      </main>

      {/* ===== Right: Security Visual ===== */}
      <section className="hidden lg:flex w-[55%] relative bg-primary overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/40 to-transparent" />

        {/* Content */}
        <div className="relative z-20 flex flex-col justify-between h-full w-full p-12 xl:p-16 text-white">
          {/* Top badge */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
              <ShieldCheck size={20} className="text-secondary" />
            </div>
            <span className="text-sm font-black uppercase tracking-[0.18em] text-white/70">
              Accesso Sicuro
            </span>
          </div>

          {/* Main copy */}
          <div className="max-w-xl">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6 leading-tight tracking-tight">
              La tua sicurezza è la nostra priorità assoluta.
            </h2>
            <p className="text-base sm:text-lg text-white/60 mb-10 leading-relaxed">
              Ogni transazione, ogni dato è protetto da crittografia di livello bancario
              e autenticazione multi-fattore intelligente.
            </p>

            {/* Security cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex flex-col gap-3">
                <Shield size={20} className="text-secondary" />
                <span className="text-lg font-black">AES-256</span>
                <span className="text-[11px] text-white/50 leading-relaxed">
                  Crittografia dei dati a riposo e in transito.
                </span>
              </div>
              <div className="p-5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex flex-col gap-3">
                <Clock size={20} className="text-secondary" />
                <span className="text-lg font-black">24/7</span>
                <span className="text-[11px] text-white/50 leading-relaxed">
                  Sorveglianza proattiva delle minacce in tempo reale.
                </span>
              </div>
            </div>
          </div>

          {/* Bottom — client count */}
          <div className="flex items-center justify-between">
            <div className="flex -space-x-3">
              {['MR', 'GL', 'AB'].map(( initials, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-primary bg-secondary/20 flex items-center justify-center text-[11px] font-black text-secondary"
                >
                  {initials}
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-primary bg-white/10 flex items-center justify-center text-[11px] font-black text-white/60">
                +1k
              </div>
            </div>
            <span className="text-[11px] text-white/40 italic">
              Già oltre 1.000 clienti ci hanno scelto.
            </span>
          </div>
        </div>

        {/* Decorative blurs */}
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-secondary/10 blur-[120px] rounded-full" aria-hidden />
        <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-accent/10 blur-[120px] rounded-full" aria-hidden />
      </section>
    </div>
  );
}
