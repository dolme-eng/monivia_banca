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
  TrendingUp,
  Lock,
  Eye,
  ArrowDownToLine,
  Banknote,
  Smartphone,
  Shield,
} from 'lucide-react';

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
      <section className="relative overflow-hidden bg-white py-20 sm:py-28 lg:py-40">
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
              <h1 className="text-display font-black tracking-tight text-primary leading-[0.95]">
                La banca che{' '}
                <span className="text-gradient-cyan">libera la tua crescita.</span>
              </h1>
            </FadeIn>

            <FadeIn delay={200}>
              <p className="text-hero-lead max-w-xl text-slate-500">
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

          {/* Right — dashboard preview card */}
          <FadeIn delay={200} className="relative mt-12 lg:mt-0">
            <div className="absolute -inset-6 bg-secondary/8 rounded-[40px] blur-3xl" aria-hidden />
            <div className="relative rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
              {/* Mini navbar inside card */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                    <Wallet size={18} className="text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Il mio conto</p>
                    <p className="text-sm font-black text-primary">Conto Personale</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Attivo
                </span>
              </div>

              {/* Balance */}
              <div className="mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Saldo disponibile</p>
                <p className="text-4xl sm:text-5xl font-black text-primary tracking-tight">
                  15.200<span className="text-2xl text-slate-400">,00 €</span>
                </p>
              </div>

              {/* Progress bar — prestito */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-black text-slate-500">Prestito erogato</p>
                  <p className="text-xs font-black text-secondary">25.000 €</p>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-secondary to-accent rounded-full" style={{ width: '60.8%' }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">15.200 € disponibili su 25.000 €</p>
              </div>

              {/* Mini transactions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <ArrowDownToLine size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-primary">Accredito prestito</p>
                      <p className="text-[10px] text-slate-400">12 Giu 2026</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-emerald-600">+25.000 €</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Banknote size={16} className="text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-primary">Prelievo</p>
                      <p className="text-[10px] text-slate-400">In attesa di approvazione</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-600">
                    <Clock size={10} />
                    Pending
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
                      <CreditCard size={16} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-primary">Pagamento carta</p>
                      <p className="text-[10px] text-slate-400">10 Giu 2026</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-red-500">-340 €</span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Decorative circle */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" aria-hidden />
      </section>

      {/* ===== SOCIAL PROOF ===== */}
      <section className="bg-white py-10 border-y border-slate-100">
        <div className="site-container">
          <p className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">
            Scelto da migliaia di clienti in Italia
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-30 grayscale">
            <div className="h-7 w-28 bg-slate-200 rounded" />
            <div className="h-7 w-20 bg-slate-200 rounded" />
            <div className="h-7 w-32 bg-slate-200 rounded" />
            <div className="h-7 w-24 bg-slate-200 rounded" />
            <div className="h-7 w-28 bg-slate-200 rounded" />
          </div>
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
                  <Smartphone size={20} className="text-secondary" />
                </div>
                <div className="relative z-10 mt-auto">
                  <p className="text-[10px] opacity-50 uppercase tracking-widest">Carta Prepagata</p>
                  <p className="font-mono text-sm tracking-[0.2em] mt-1">•••• •••• •••• 4821</p>
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
              <div className="flex items-center gap-2 bg-primary-container/50 p-3 rounded-lg border border-white/10">
                <Shield size={16} className="text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">Sistema attivo 24/7</span>
              </div>
            </FadeIn>

            {/* Feature 3 — Prelievi & Trasferimenti */}
            <FadeIn delay={150} className="col-span-12 md:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <Banknote size={28} />
              </div>
              <h3 className="text-xl font-black text-primary sm:text-2xl mb-3">Prelievi & Trasferimenti</h3>
              <p className="text-sm leading-relaxed text-slate-500">
                Preleva o trasferisci i tuoi fondi in qualsiasi momento. Ogni operazione viene
                confermata dall&apos;amministrazione per la tua sicurezza.
              </p>
            </FadeIn>

            {/* Feature 4 — Timeline amministrativa (large) */}
            <FadeIn delay={200} className="col-span-12 md:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-8 overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                    <Clock size={28} />
                  </div>
                  <h3 className="text-xl font-black text-primary sm:text-2xl mb-3">Controllo Amministrativo</h3>
                  <p className="text-sm leading-relaxed text-slate-500">
                    Ogni prelievo e trasferimento passa dal team amministrativo.
                    Visualizza lo stato in tempo reale con barra di avanzamento e tempo stimato.
                  </p>
                </div>
                {/* Timeline mockup */}
                <div className="flex flex-col gap-3 w-full md:w-72 shrink-0">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-primary">Prelievo 5.000 €</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-600">
                        <Clock size={10} />
                        In corso
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-secondary to-accent rounded-full animate-pulse" style={{ width: '45%' }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">Tempo stimato: ~2 ore</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm opacity-60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-primary">Trasferimento 2.000 €</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-black uppercase text-slate-400">
                        In coda
                      </span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-primary">Prelievo 1.500 €</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-600">
                        <CheckCircle2 size={10} />
                        Completato
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIAL ===== */}
      <section className="section-pad bg-primary relative overflow-hidden" id="testimonials">
        <div className="site-container relative z-10">
          <FadeIn>
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 sm:p-12 lg:p-16 border border-white/10 flex flex-col items-center text-center">
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                <span className="text-secondary text-3xl font-black">&ldquo;</span>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-black text-white italic mb-10 max-w-3xl leading-snug tracking-tight">
                Monivia Banca ha trasformato la mia gestione finanziaria. La rapidità dei prelievi
                e la semplicità dell&apos;interfaccia mi permettono di concentrarmi su ciò che conta:
                la mia crescita.
              </p>
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full border-2 border-secondary p-0.5 bg-primary flex items-center justify-center">
                  <span className="text-lg font-black text-secondary">MR</span>
                </div>
                <div>
                  <p className="text-sm font-black text-white">Marco Rossi</p>
                  <p className="text-xs text-secondary">Imprenditore, Milano</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-primary to-transparent" aria-hidden />
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

      {/* ===== ANALYTICS PREVIEW ===== */}
      <section className="section-pad bg-slate-50/50">
        <div className="site-container grid lg:grid-cols-2 gap-16 items-center">
          <FadeIn>
            <h2 className="section-heading mb-8">Pilota le tue finanze con dati reali.</h2>
            <ul className="flex flex-col gap-6">
              <li className="flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <TrendingUp size={20} className="text-secondary" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-primary mb-1">Analisi in tempo reale</h4>
                  <p className="text-sm text-slate-500">Visualizza i tuoi flussi finanziari e le tendenze di spesa istantaneamente.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Eye size={20} className="text-secondary" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-primary mb-1">Trasparenza totale</h4>
                  <p className="text-sm text-slate-500">Ogni movimento è tracciato e visibile: prelievi, accredity, transferimenti in attesa.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Lock size={20} className="text-secondary" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-primary mb-1">Sicurezza garantita</h4>
                  <p className="text-sm text-slate-500">Crittografia di livello bancario e approvazione manuale per ogni operazione.</p>
                </div>
              </li>
            </ul>
          </FadeIn>

          <FadeIn delay={200}>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Saldo totale</p>
                <p className="text-xl font-black text-primary">15.200 €</p>
                <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm translate-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Prelievi in sospeso</p>
                <p className="text-xl font-black text-amber-600">2</p>
                <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: '30%' }} />
                </div>
              </div>
              <div className="col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mt-2">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-sm font-black text-primary">Movimenti recenti</span>
                  <span className="text-[10px] font-black bg-secondary/10 text-secondary px-3 py-1 rounded-full">Ultimi 30 giorni</span>
                </div>
                <div className="flex items-end gap-1.5 h-28">
                  {[40, 65, 55, 90, 70, 85, 75, 50, 60, 80, 45, 95].map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t ${i === 3 || i === 11 ? 'bg-secondary' : 'bg-slate-100'}`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
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
                <p className="mt-8 text-white/30 text-[11px] font-black uppercase tracking-[0.18em]">
                  Apertura in 10 minuti. Nessun costo nascosto.
                </p>
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
