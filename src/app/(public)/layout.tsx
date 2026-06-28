import Link from 'next/link';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="fixed left-0 top-0 z-50 w-full border-b border-slate-200/70 bg-white text-primary shadow-sm">
        <div className="hidden border-b border-slate-100 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 md:block">
          <div className="site-container flex h-9 items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5">Monivia S.r.l.</span>
              <span className="flex items-center gap-1.5">Dashboard Sicuro</span>
            </div>
            <span className="hidden lg:block">Accesso riservato all&apos;amministrazione</span>
          </div>
        </div>
        <div className="site-container flex h-[68px] items-center justify-between">
          <Link
            href="/"
            className="relative z-50 flex items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
          >
            <span className="text-2xl font-black tracking-tight text-primary">
              MO<span className="text-secondary">NIVIA</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link href="/" className="rounded-full px-4 py-2 text-sm font-black text-slate-500 hover:bg-slate-100 hover:text-primary transition-colors">
              Home
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800">
              Accedi
            </Link>
          </div>
        </div>
      </header>
      <main className="min-h-screen pt-[68px] md:pt-[108px]">
        {children}
      </main>
      <footer className="relative overflow-hidden bg-[#050d1a] text-slate-400">
        <div className="site-container relative z-10">
          <div className="border-t border-white/6 py-12 sm:py-16">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="mb-5 text-2xl font-black tracking-tight text-white">
                  MO<span className="text-secondary">NIVIA</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-500">
                  Piattaforma bancaria sicura per la gestione dei prestiti Monivia.
                </p>
              </div>
              <div>
                <h3 className="mb-5 text-[11px] font-black uppercase tracking-[0.2em] text-white">Navigazione</h3>
                <ul className="space-y-3">
                  <li><Link href="/" className="group flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-secondary"><span className="h-px w-0 bg-secondary transition-all duration-300 group-hover:w-3" />Home</Link></li>
                  <li><Link href="/login" className="group flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-secondary"><span className="h-px w-0 bg-secondary transition-all duration-300 group-hover:w-3" />Accesso Riservato</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-5 text-[11px] font-black uppercase tracking-[0.2em] text-white">Sicurezza</h3>
                <ul className="space-y-3">
                  <li><span className="text-sm text-slate-500">Crittografia AES-256</span></li>
                  <li><span className="text-sm text-slate-500">Autenticazione rigorosa</span></li>
                  <li><span className="text-sm text-slate-500">Log di audit completi</span></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-5 text-[11px] font-black uppercase tracking-[0.2em] text-white">Contatto</h3>
                <ul className="space-y-3">
                  <li><span className="text-sm text-slate-500">contatto@monivia.it</span></li>
                  <li><span className="text-sm text-slate-500">Via Savona, 15 — Milano</span></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-white/6 pt-8 pb-8">
            <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
              <p className="text-xs text-slate-600">
                © 2026 Monivia S.r.l. — P.IVA / C.F. 10984760583 — OAM n. A23741
              </p>
              <p className="text-[11px] text-slate-700">
                Sistemi di Gestione Bancaria Sicura
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
