'use client';

import { useState } from 'react';
import {
  Send,
  Clock,
  CheckCircle2,
  Calendar,
  ChevronRight,
  Shield,
  Info,
  UserSearch,
} from 'lucide-react';

const RECIPIENTS = [
  { initials: 'ER', name: 'Elena Rossi', role: 'Famiglia', color: 'bg-secondary/10 text-secondary' },
  { initials: 'LB', name: 'Luca Bianchi', role: 'Fornitore', color: 'bg-accent/10 text-accent' },
  { initials: 'AS', name: 'Azienda Srl', role: 'Vendor', color: 'bg-slate-100 text-slate-500' },
];

const SCHEDULED = [
  { desc: 'Affitto appartamento', date: '1 Lug 2026', amount: '-1.200 €', status: 'pending' },
  { desc: 'Polizza assicurativa', date: '15 Lug 2026', amount: '-350 €', status: 'pending' },
];

export default function PaymentsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-primary">Pagamenti e Trasferimenti</h1>
        <p className="text-sm text-slate-500 mt-1">Gestisci i tuoi trasferimenti in modo semplice e sicuro.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Transfer Form */}
        <section className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h2 className="text-sm font-black text-primary mb-5 flex items-center gap-2">
              <Send size={16} className="text-secondary" />
              Nuovo Trasferimento
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Sender account */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Conto mittente</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all outline-none">
                    <option>Conto Personale •• 4821 (15.200 €)</option>
                  </select>
                </div>

                {/* Recipient name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Nome destinatario</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Nome o azienda"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 pr-10 text-sm focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all outline-none"
                    />
                    <UserSearch size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* IBAN */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">IBAN destinatario</label>
                  <input
                    type="text"
                    placeholder="IT00 A000 0000 0000 0000 0000 000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all outline-none"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Importo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-black">€</span>
                    <input
                      type="number"
                      placeholder="0,00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 pl-8 text-sm font-black focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Reference */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Causale</label>
                <input
                  type="text"
                  placeholder="Fattura / Pagamento servizi"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-secondary focus:ring-secondary/30" />
                  <span className="text-sm text-slate-500">Programma per data successiva</span>
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto btn-cyan px-8 py-3 text-sm"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Elaborazione...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 size={16} />
                      Inviato
                    </>
                  ) : (
                    <>
                      Invia Trasferimento
                      <Send size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Scheduled Payments */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xs font-black text-primary uppercase tracking-wider">Pagamenti Programmati</h3>
              <button className="text-accent text-[10px] font-black hover:underline">Vedi tutti</button>
            </div>
            <div className="divide-y divide-slate-100">
              {SCHEDULED.map((p, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                      <Calendar size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-primary">{p.desc}</p>
                      <p className="text-[10px] text-slate-400">{p.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-primary">{p.amount}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-600">
                      <Clock size={8} /> In attesa
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-4">
          {/* Frequent Recipients */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4">Destinatari Frecuenti</h3>
            <div className="grid grid-cols-2 gap-2">
              {RECIPIENTS.map((r) => (
                <button key={r.name} className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black ${r.color}`}>
                    {r.initials}
                  </div>
                  <span className="text-[10px] font-black text-primary text-center">{r.name}</span>
                  <span className="text-[9px] text-slate-400">{r.role}</span>
                </button>
              ))}
              <button className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-slate-50 border border-dashed border-slate-300 transition-all">
                <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-400">
                  <span className="text-lg">+</span>
                </div>
                <span className="text-[10px] font-black text-primary">Aggiungi</span>
                <span className="text-[9px] text-slate-400">Nuovo</span>
              </button>
            </div>
          </div>

          {/* Daily Limit */}
          <div className="bg-primary rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} aria-hidden />
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-xs font-black text-secondary uppercase tracking-wider">Limite Giornaliero</h3>
                <Info size={14} className="text-white/40" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">4.800 € utilizzati</span>
                  <span className="font-black">10.000 €</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: '48%' }} />
                </div>
              </div>
              <p className="text-[10px] text-white/40">
                Hai il 52% del limite giornaliero disponibile. Per richiedere un aumento, contatta il tuo gestore.
              </p>
              <button className="w-full py-2 border border-secondary text-secondary text-xs font-black rounded-lg hover:bg-secondary hover:text-primary transition-all">
                Richiedi Aumento
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-4 border border-slate-200 rounded-xl flex gap-3 items-start bg-white">
            <Shield size={18} className="text-secondary shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black text-primary uppercase">Banca Verificata</p>
              <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                Tutti i trasferimenti sono protetti da crittografia di livello bancario e autenticazione multi-fattore.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
