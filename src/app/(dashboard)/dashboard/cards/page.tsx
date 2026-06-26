'use client';

import { useState } from 'react';
import {
  CreditCard,
  Wifi,
  Snowflake,
  Lock,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShoppingCart,
  Utensils,
  Plane,
  Zap,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';

const ACTIVITY = [
  { desc: 'Amazon Web Services', date: '14 Giu, 14:20', amount: '-1.240 €', status: 'completed', icon: ShoppingCart },
  { desc: 'Ristorante Il Forno', date: '13 Giu, 20:45', amount: '-412 €', status: 'completed', icon: Utensils },
  { desc: 'Alitalia', date: '12 Giu, 09:12', amount: '-2.100 €', status: 'completed', icon: Plane },
  { desc: 'Enel Energia', date: '10 Giu, 11:00', amount: '-185 €', status: 'completed', icon: Zap },
];

export default function CardsPage() {
  const [showCvv, setShowCvv] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary">Gestione Carte</h1>
          <p className="text-sm text-slate-500 mt-1">Visualizza e gestisci le tue carte prepagate.</p>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Main Card Display */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200/80 p-6 rounded-xl flex flex-col md:flex-row gap-6 items-center" style={{ boxShadow: 'var(--shadow-card)' }}>
          {/* Card visual */}
          <div className="w-80 h-48 rounded-xl p-5 flex flex-col justify-between text-white relative shadow-2xl overflow-hidden shrink-0"
            style={{ background: 'rgba(10, 22, 40, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-secondary rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-accent rounded-full blur-3xl" />
            </div>
            <div className="flex justify-between items-start z-10">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] opacity-80">Carta Prepagata</p>
                <p className="text-lg font-black mt-1">Monivia Banca</p>
              </div>
              <Wifi size={24} className="text-secondary -rotate-90" />
            </div>
            <div className="z-10">
              <p className="font-mono text-sm tracking-[0.2em] mb-4">4532 •••• •••• 4821</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] opacity-50 uppercase">Titolare</p>
                  <p className="text-xs font-black uppercase">Marco Rossi</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] opacity-50 uppercase">Scade</p>
                  <p className="text-xs font-black">12/29</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card Details */}
          <div className="flex-1 w-full">
            <div className="flex justify-between items-center mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Attiva
              </span>
              <span className="text-xs text-slate-400 italic">Carta Fisica</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Limite mensile</span>
                <span className="text-sm font-black text-primary">5.000 €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Speso questo mese</span>
                <span className="text-sm font-black text-primary">1.837 €</span>
              </div>
              <div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: '36.7%' }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-slate-400">36,7% del limiter utilizzato</span>
                  <span className="text-[10px] text-primary font-black">3.163 € disponibili</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Controls */}
        <div className="col-span-12 lg:col-span-4 grid grid-cols-3 gap-3">
          {[
            { icon: Snowflake, label: 'Congela' },
            { icon: Lock, label: 'CAMBIA PIN' },
            { icon: RefreshCw, label: 'Sostituisci' },
          ].map(({ icon: Icon, label }) => (
            <button key={label} className="bg-white border border-slate-200 p-4 rounded-xl hover:shadow-md transition-all group flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-secondary group-hover:text-primary transition-colors text-slate-500">
                <Icon size={16} />
              </div>
              <span className="text-[10px] font-black text-primary">{label}</span>
            </button>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200/80 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-sm font-black text-primary">Attività Recente</h3>
            <button className="text-secondary text-xs font-black hover:underline">Vedi tutto</button>
          </div>
          <div className="divide-y divide-slate-100">
            {ACTIVITY.map((tx, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <tx.icon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-primary">{tx.desc}</p>
                    <p className="text-[10px] text-slate-400">{tx.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-primary">{tx.amount}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600">
                    <CheckCircle2 size={8} /> Completato
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          {/* Card List */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-xs font-black text-primary mb-3 px-2">Le mie Carte</h3>
            <div className="space-y-2">
              <div className="p-3 bg-slate-100 rounded-lg flex items-center gap-3 border border-secondary">
                <div className="w-10 h-6 rounded bg-primary flex items-center justify-center text-[9px] text-secondary font-black">FIS</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-primary truncate">Fisica •• 4821</p>
                  <p className="text-[10px] text-slate-400">Marco Rossi</p>
                </div>
                <CheckCircle2 size={14} className="text-secondary shrink-0" />
              </div>
              <div className="p-3 hover:bg-slate-50 rounded-lg flex items-center gap-3 cursor-pointer transition-colors border border-transparent">
                <div className="w-10 h-6 rounded bg-accent flex items-center justify-center text-[9px] text-white font-black">VRT</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-primary truncate">Virtuale •• 7733</p>
                  <p className="text-[10px] text-slate-400">Per abbonamenti</p>
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                <Shield size={16} />
              </div>
              <h3 className="text-xs font-black text-primary">Impostazioni Sicurezza</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Pagamenti online', desc: 'Attiva pagamenti web', on: true },
                { label: 'Prelievi ATM', desc: 'Accesso globale ATM', on: true },
                { label: 'Pagamenti contactless', desc: 'NFC tap to pay', on: false },
              ].map(({ label, desc, on }) => (
                <div key={label} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-primary">{label}</p>
                    <p className="text-[10px] text-slate-400">{desc}</p>
                  </div>
                  <button
                    className={`w-10 h-5 rounded-full relative transition-colors ${on ? 'bg-secondary' : 'bg-slate-200'}`}
                    aria-label={label}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
