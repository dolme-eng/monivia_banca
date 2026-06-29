'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import {
  ArrowRight,
  CreditCard,
  ShieldCheck,
  Wallet,
  Clock,
  CheckCircle2,
  Lock,
  Banknote,
  Shield,
} from 'lucide-react';
import HeroBackground from '@/components/HeroBackground';
import DashboardDemo from '@/components/DashboardDemo';

function FadeIn({ children, className = '', delay = 0, style }: { children: React.ReactNode; className?: string; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.classList.add('opacity-100', 'translate-y-0');
            el.classList.remove('opacity-0', 'translate-y-8');
          }, delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`opacity-0 translate-y-8 transition-all duration-700 ease-out ${className}`} style={style}>
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-40">
        <HeroBackground />
        <div className="site-container relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left copy */}
          <div className="flex flex-col gap-8">
            <FadeIn>
              <div className="badge-dark inline-flex w-fit">
                <span className="inline-flex h-2 w-2 rounded-full bg-secondary" aria-hidden />
                Soluzione certificata OAM
              </div>
            </FadeIn>

            <FadeIn delay={100}>
              <h1 className="text-display font-black tracking-tight text-white leading-[0.95]">
                La banca che{' '}
                <span className="text-gradient-cyan">libera la tua crescita.</span>
              </h1>
            </FadeIn>

            <FadeIn delay={200}>
              <p className="text-hero-lead max-w-xl text-white/60">
                Gestisci le tue finanze, le tue carte e i tuoi pagamenti con una piattaforma sicura
                pensata per chi vuole semplicità e trasparenza.
              </p>
            </FadeIn>

            <FadeIn delay={300}>
              <div className="flex flex-wrap gap-4 mt-2">
                <Link href="/login" className="btn-cyan px-8 py-4 text-sm">
                  Accedi alla tua area
                  <ArrowRight size={16} />
                </Link>
              </div>
            </FadeIn>
          </div>

          {/* Right — animated dashboard preview */}
          <FadeIn delay={200} className="relative mt-12 lg:mt-0">
            <DashboardDemo />
          </FadeIn>
        </div>
      </section>

      {/* ===== FEATURES — BENTO GRID ===== */}
      <section className="section-pad bg-slate-50/50" id="features">
        <div className="site-container">
          <FadeIn className="text-center mb-16">
            <div className="badge inline-flex mb-4">
              <Wallet size={12} />
              Funzionalità
            </div>
            <h2 className="section-heading">Tutto ciò di cui hai bisogno.</h2>
            <p className="section-copy mt-5 max-w-xl mx-auto">
              Una suite completa di strumenti finanziari per gestire i tuoi fondi senza attrito.
            </p>
          </FadeIn>

          <div className="grid grid-cols-12 gap-6">
            {/* Feature 1 — Conto & Carta (large) */}
            <FadeIn className="col-span-12 md:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-8 flex flex-col md:flex-row items-center gap-8" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex-1">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <CreditCard size={28} />
                </div>
                <h3 className="text-xl font-black text-primary sm:text-2xl mb-3">Conto & Carta Monivia</h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  Ricevi il tuo prestito direttamente sul conto. Gestisci la tua carta virtuale e fisica,
                  imposta i limiti e controlla ogni transazione in tempo reale.
                </p>
              </div>
              {/* Mockup card */}
              <div className="w-full md:w-64 h-48 bg-primary rounded-xl p-5 flex flex-col justify-between text-white shadow-xl relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 rounded-full blur-2xl" aria-hidden />
                <div className="flex justify-between items-start relative z-10">
                  <span className="text-lg font-black tracking-tight">MONIVIA</span>
                  <div className="w-8 h-6 bg-secondary/30 rounded" aria-hidden />
                </div>
                <div className="relative z-10 mt-auto">
                  <p className="text-[11px] opacity-50 uppercase tracking-widest">Carta Prepagata</p>
                  <p className="font-mono text-sm tracking-[0.2em] mt-1">•••• •••• •••• ••••</p>
                </div>
              </div>
            </FadeIn>

            {/* Feature 2 — Sicurezza (dark) */}
            <FadeIn delay={100} className="col-span-12 md:col-span-4 bg-primary p-8 rounded-2xl text-white">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-black sm:text-2xl mb-3">Sicurezza Bancaria</h3>
              <p className="text-sm leading-relaxed opacity-70 mb-5">
                2FA, crittografia e protezione avanzata per custodire ogni centesimo.
              </p>
              <div className="flex items-center gap-2 bg-primary/50 p-3 rounded-lg border border-white/10">
                <Shield size={16} className="text-emerald-400" />
                <span className="text-[11px] font-black uppercase tracking-widest">Sistema attivo 24/7</span>
              </div>
            </FadeIn>

            {/* Feature 3 — Prelievi & Trasferimenti */}
            <FadeIn delay={150} className="col-span-12 md:col-span-6 rounded-2xl border border-slate-200/80 bg-white p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <Banknote size={28} />
              </div>
              <h3 className="text-xl font-black text-primary sm:text-2xl mb-3">Prelievi & Trasferimenti</h3>
              <p className="text-sm leading-relaxed text-slate-500">
                Preleva o trasferisci i tuoi fondi in qualsiasi momento. Ogni operazione viene
                confermata dall&apos;amministrazione per la tua sicurezza.
              </p>
            </FadeIn>

            {/* Feature 4 — Controllo Amministrativo */}
            <FadeIn delay={200} className="col-span-12 md:col-span-6 rounded-2xl border border-slate-200/80 bg-white p-8 overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <Clock size={28} />
              </div>
              <h3 className="text-xl font-black text-primary sm:text-2xl mb-3">Controllo Amministrativo</h3>
              <p className="text-sm leading-relaxed text-slate-500">
                Ogni prelievo e trasferimento passa dal team amministrativo.
                Visualizza lo stato in tempo reale direttamente dalla tua dashboard.
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="section-pad bg-white" id="how">
        <div className="site-container">
          <FadeIn className="text-center mb-16">
            <div className="badge inline-flex mb-4">
              <Clock size={12} />
              Come funziona
            </div>
            <h2 className="section-heading">Tre passi verso il tuo prestito.</h2>
            <p className="section-copy mt-5 max-w-xl mx-auto">
              Dalla richiesta all&apos;accredito: un processo semplice, trasparente e sicuro.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <FadeIn delay={0}>
              <div className="surface-card p-8 text-center h-full">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                  <span className="text-2xl font-black">1</span>
                </div>
                <h3 className="text-lg font-black text-primary mb-3">Richiedi su Monivia</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Compila il modulo di richiesta prestito sul sito Monivia.
                  Il nostro team valuterà la tua richiesta.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={150}>
              <div className="surface-card p-8 text-center h-full">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                  <span className="text-2xl font-black">2</span>
                </div>
                <h3 className="text-lg font-black text-primary mb-3">Ricevi le credenziali</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Una volta approvato, riceverai email e WhatsApp con i tuoi
                  dati di accesso alla piattaforma bancaria.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={300}>
              <div className="surface-card p-8 text-center h-full">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                  <span className="text-2xl font-black">3</span>
                </div>
                <h3 className="text-lg font-black text-primary mb-3">Gestisci i tuoi fondi</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Accedi alla dashboard, visualizza il saldo e preleva quando vuoi.
                  Ogni operazione viene confermata dal nostro team.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="section-pad">
        <div className="site-container">
          <FadeIn>
            <div className="bg-gradient-to-br from-primary to-[#1a2b45] rounded-[40px] p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-6 tracking-tight">
                  Pronto a gestire i tuoi fondi?
                </h2>
                <p className="text-base sm:text-lg text-white/60 mb-10 max-w-2xl mx-auto">
                  Unisciti a migliaia di clienti che hanno già scelto la modernità e la sicurezza.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/login" className="btn-cyan px-8 py-4 text-sm">
                    Accedi alla tua area
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
              {/* Decorative dots */}
              <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} aria-hidden />
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
