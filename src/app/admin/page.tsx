import Link from 'next/link';
import { LayoutDashboard, Clock, Wallet, ShieldCheck, ArrowRight, Settings, Users, CreditCard } from 'lucide-react';

export default function AdminHub() {
  return (
    <section className="section-pad">
      <div className="site-container">
        {/* Titolo */}
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <div className="badge inline-flex mb-4">
            <Settings size={12} />
            Amministrazione
          </div>
          <h2 className="section-heading">Console di Amministrazione</h2>
          <p className="section-copy mt-5">
            Gestione centralizzata degli asset finanziari, provisionamento dei prestiti e controllo dei flussi di cassa.
          </p>
        </div>

        {/* Griglia */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/dashboard"
            className="surface-card group relative overflow-hidden p-8 sm:p-10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:rounded-xl"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 text-secondary transition-colors group-hover:bg-secondary group-hover:text-primary">
              <LayoutDashboard size={28} />
            </div>
            <h3 className="mb-3 text-xl font-black text-primary sm:text-2xl">
              Dashboard
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-slate-500">
              Panoramica generale dei conti, statistiche e stato del sistema.
            </p>
            <div className="flex items-center text-secondary font-black text-sm gap-2 group-hover:gap-3 transition-all">
              Visualizza <ArrowRight size={16} />
            </div>
          </Link>

          <Link
            href="/admin/accounts"
            className="surface-card group relative overflow-hidden p-8 sm:p-10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:rounded-xl"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 text-secondary transition-colors group-hover:bg-secondary group-hover:text-primary">
              <Users size={28} />
            </div>
            <h3 className="mb-3 text-xl font-black text-primary sm:text-2xl">
              Gestione Conti
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-slate-500">
              Valida, congela, blocca ed elimina i conti clienti. Controllo totale sul ciclo di vita.
            </p>
            <div className="flex items-center text-secondary font-black text-sm gap-2 group-hover:gap-3 transition-all">
              Gestisci i conti <ArrowRight size={16} />
            </div>
          </Link>

          <Link
            href="/admin/cards"
            className="surface-card group relative overflow-hidden p-8 sm:p-10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:rounded-xl"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 text-secondary transition-colors group-hover:bg-secondary group-hover:text-primary">
              <CreditCard size={28} />
            </div>
            <h3 className="mb-3 text-xl font-black text-primary sm:text-2xl">
              Gestione Carte
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-slate-500">
              Congela, attiva, segna scadute ed elimina le carte dei clienti. Controllo totale sullo stato delle carte.
            </p>
            <div className="flex items-center text-secondary font-black text-sm gap-2 group-hover:gap-3 transition-all">
              Gestisci le carte <ArrowRight size={16} />
            </div>
          </Link>

          <Link
            href="/admin/provision"
            className="surface-card group relative overflow-hidden p-8 sm:p-10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:rounded-xl"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 text-secondary transition-colors group-hover:bg-secondary group-hover:text-primary">
              <Wallet size={28} />
            </div>
            <h3 className="mb-3 text-xl font-black text-primary sm:text-2xl">
              Provisionamento
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-slate-500">
              Inserimento dei dati del cliente e creazione istantanea di account accreditati per i prestiti approvati.
            </p>
            <div className="flex items-center text-secondary font-black text-sm gap-2 group-hover:gap-3 transition-all">
              Avvia l&apos;operazione <ArrowRight size={16} />
            </div>
          </Link>

          <Link
            href="/admin/approvals"
            className="surface-card group relative overflow-hidden p-8 sm:p-10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:rounded-xl"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 text-secondary transition-colors group-hover:bg-secondary group-hover:text-primary">
              <ShieldCheck size={28} />
            </div>
            <h3 className="mb-3 text-xl font-black text-primary sm:text-2xl">
              Validazioni
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-slate-500">
              Centro di controllo delle transazioni. Approva o rifiuta le richieste di prelievo e trasferimento.
            </p>
            <div className="flex items-center text-secondary font-black text-sm gap-2 group-hover:gap-3 transition-all">
              Verifica i flussi <ArrowRight size={16} />
            </div>
          </Link>

          <Link
            href="/admin/timeline"
            className="surface-card group relative overflow-hidden p-8 sm:p-10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:rounded-xl"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 text-secondary transition-colors group-hover:bg-secondary group-hover:text-primary">
              <Clock size={28} />
            </div>
            <h3 className="mb-3 text-xl font-black text-primary sm:text-2xl">
              Timeline
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-slate-500">
              Storico completo delle transazioni con filtri per stato e dettaglio operazioni.
            </p>
            <div className="flex items-center text-secondary font-black text-sm gap-2 group-hover:gap-3 transition-all">
              Consulta lo storico <ArrowRight size={16} />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
