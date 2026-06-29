'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  CreditCard,
  Clock,
  Send,
} from 'lucide-react';

const SCENES = [
  {
    balance: '0,00',
    loanPct: 0,
    loanDetail: '0 € disponibili su 25.000 €',
    txs: [] as { icon: typeof Wallet; color: string; bg: string; title: string; time: string; amount: string; amountColor: string; badge?: string; badgeColor?: string }[],
  },
  {
    balance: '25.000,00',
    loanPct: 100,
    loanDetail: '25.000 € disponibili su 25.000 €',
    txs: [
      { icon: ArrowDownToLine, color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'Accredito prestito', time: '12 Giu 2026', amount: '+25.000 €', amountColor: 'text-emerald-600' },
    ],
  },
  {
    balance: '24.660,00',
    loanPct: 98.6,
    loanDetail: '24.660 € disponibili su 25.000 €',
    txs: [
      { icon: ArrowDownToLine, color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'Accredito prestito', time: '12 Giu 2026', amount: '+25.000 €', amountColor: 'text-emerald-600' },
      { icon: CreditCard, color: 'text-slate-500', bg: 'bg-slate-100', title: 'Pagamento carta', time: '10 Giu 2026', amount: '-340 €', amountColor: 'text-red-500' },
    ],
  },
  {
    balance: '22.160,00',
    loanPct: 88.6,
    loanDetail: '22.160 € disponibili su 25.000 €',
    txs: [
      { icon: ArrowDownToLine, color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'Accredito prestito', time: '12 Giu 2026', amount: '+25.000 €', amountColor: 'text-emerald-600' },
      { icon: ArrowUpFromLine, color: 'text-secondary', bg: 'bg-secondary/10', title: 'Prelievo', time: 'In attesa di approvazione', amount: '', amountColor: '', badge: 'In Attesa', badgeColor: 'bg-amber-50 text-amber-600' },
      { icon: CreditCard, color: 'text-slate-500', bg: 'bg-slate-100', title: 'Pagamento carta', time: '10 Giu 2026', amount: '-340 €', amountColor: 'text-red-500' },
    ],
  },
  {
    balance: '15.200,00',
    loanPct: 60.8,
    loanDetail: '15.200 € disponibili su 25.000 €',
    txs: [
      { icon: ArrowDownToLine, color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'Accredito prestito', time: '12 Giu 2026', amount: '+25.000 €', amountColor: 'text-emerald-600' },
      { icon: ArrowUpFromLine, color: 'text-secondary', bg: 'bg-secondary/10', title: 'Prelievo', time: 'In attesa di approvazione', amount: '', amountColor: '', badge: 'In Attesa', badgeColor: 'bg-amber-50 text-amber-600' },
      { icon: CreditCard, color: 'text-slate-500', bg: 'bg-slate-100', title: 'Pagamento carta', time: '10 Giu 2026', amount: '-340 €', amountColor: 'text-red-500' },
      { icon: Send, color: 'text-accent', bg: 'bg-accent/10', title: 'Trasferimento', time: '8 Giu 2026', amount: '-6.500 €', amountColor: 'text-red-500' },
    ],
  },
];

export default function DashboardDemo() {
  const [scene, setScene] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const next = useCallback(() => {
    setScene((s) => (s + 1) % SCENES.length);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(next, 3000);
    return () => clearInterval(id);
  }, [mounted, next]);

  const s = SCENES[scene];

  return (
    <div className="relative rounded-2xl bg-white p-6 sm:p-8 shadow-2xl overflow-hidden h-[420px] flex flex-col">
      {/* Glow */}
      <div className="absolute -inset-10 bg-secondary/5 rounded-[40px] blur-3xl -z-10" aria-hidden />

      {/* Pulse dot */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Live</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <Wallet size={16} className="text-secondary" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Il mio conto</p>
            <p className="text-sm font-black text-primary">Conto Personale</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Attivo
        </span>
      </div>

      {/* Balance */}
      <div className="mb-3 shrink-0">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Saldo disponibile</p>
        <p className="text-3xl sm:text-4xl font-black text-primary tracking-tight">
          {s.balance}<span className="text-xl text-slate-400"> €</span>
        </p>
      </div>

      {/* Loan progress */}
      <div className="mb-4 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-black text-slate-600">Prestito erogato</p>
          <p className="text-xs font-black text-secondary">25.000 €</p>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-secondary to-accent rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${s.loanPct}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-1">{s.loanDetail}</p>
      </div>

      {/* Transactions — fixed height area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="space-y-2">
          {s.txs.map((tx, i) => {
            const Icon = tx.icon;
            return (
              <div
                key={`${scene}-${i}`}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50"
                style={{
                  opacity: 0,
                  animation: `demoSlideIn 0.4s ease-out ${i * 0.12}s forwards`,
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`h-8 w-8 rounded-lg ${tx.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={14} className={tx.color} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-primary truncate">{tx.title}</p>
                    <p className="text-[11px] text-slate-400">{tx.time}</p>
                  </div>
                </div>
                {tx.badge ? (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black uppercase shrink-0 ${tx.badgeColor}`}>
                    <Clock size={10} />
                    {tx.badge}
                  </span>
                ) : (
                  <span className={`text-sm font-black shrink-0 ${tx.amountColor}`}>{tx.amount}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scene dots */}
      <div className="flex justify-center gap-1.5 mt-3 shrink-0">
        {SCENES.map((_, i) => (
          <button
            key={i}
            onClick={() => setScene(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === scene ? 'w-6 bg-secondary' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
            }`}
            aria-label={`Scena ${i + 1}`}
          />
        ))}
      </div>

      <style jsx global>{`
        @keyframes demoSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
