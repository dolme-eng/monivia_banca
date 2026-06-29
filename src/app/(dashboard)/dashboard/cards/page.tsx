'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth-client';
import {
  CreditCard,
  Wifi,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';

interface CardData {
  id: string;
  number: string;
  expiry: string;
  holder: string;
  status: string;
}

interface UserData {
  nome: string;
  cognome: string;
  accounts: {
    id: string;
    iban: string;
    balance: number;
    cards: CardData[];
    transactions: {
      id: string;
      type: string;
      amount: number;
      description: string;
      status: string;
      createdAt: string;
    }[];
  }[];
}

export default function CardsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCard, setSelectedCard] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await authFetch('/api/user/account');
        if (res.status === 401) {
          window.location.replace('/login');
          return;
        }
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
        } else {
          setError('Impossibile caricare i dati delle carte.');
        }
      } catch {
        setError('Errore di connessione.');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-secondary" />
      </div>
    );
  }

  const account = user?.accounts?.[0];
  const cards = account?.cards ?? [];
  const card = cards[selectedCard];
  const transactions = account?.transactions ?? [];
  const balance = account?.balance ?? 0;
  const spentPercent = account?.balance != null ? Math.min(Math.max(((5000 - balance) / 5000) * 100, 0), 100) : 0;

  const maskNumber = (num: string) => {
    const last4 = num.slice(-4);
    return `•••• •••• •••• ${last4}`;
  };

  const formatAmount = (amount: number) =>
    Math.abs(amount).toLocaleString('it-IT', { minimumFractionDigits: 2 });

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) + ', ' +
      d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const getIcon = (type: string) => {
    if (type === 'CREDIT' || type === 'TRANSFER_IN') return CheckCircle2;
    return Clock;
  };

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-black text-red-600">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary">Gestione Carte</h1>
          <p className="text-sm text-slate-500 mt-1">Visualizza e gestisci le tue carte prepagate.</p>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center border border-slate-200/80" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <CreditCard size={32} />
          </div>
          <h3 className="mb-2 text-xl font-black text-primary">Nessuna carta associata</h3>
          <p className="text-sm text-slate-500">Contatta l&apos;amministrazione per richiedere una carta.</p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Main Card Display */}
          <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200/80 p-6 rounded-xl flex flex-col md:flex-row gap-6 items-center" style={{ boxShadow: 'var(--shadow-card)' }}>
            {/* Card visual */}
            <div className="w-full max-w-80 h-48 rounded-xl p-5 flex flex-col justify-between text-white relative shadow-2xl overflow-hidden shrink-0"
              style={{ background: 'rgba(10, 22, 40, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-secondary rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-accent rounded-full blur-3xl" />
              </div>
              <div className="flex justify-between items-start z-10">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">Carta Prepagata</p>
                  <p className="text-lg font-black mt-1">Monivia Banca</p>
                </div>
                <Wifi size={24} className="text-secondary -rotate-90" />
              </div>
              <div className="z-10">
                <p className="font-mono text-sm tracking-[0.2em] mb-4">{maskNumber(card.number)}</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[11px] opacity-50 uppercase">Titolare</p>
                    <p className="text-xs font-black uppercase">{card.holder}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] opacity-50 uppercase">Scade</p>
                    <p className="text-xs font-black">{card.expiry}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Details */}
            <div className="flex-1 w-full">
              <div className="flex justify-between items-center mb-4">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase ${
                  card.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${card.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {card.status === 'ACTIVE' ? 'Attiva' : card.status === 'FROZEN' ? 'Congelata' : 'Scaduta'}
                </span>
                <span className="text-xs text-slate-400 italic">
                  {card.number.startsWith('4') ? 'Carta Fisica' : 'Carta Virtuale'}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Saldo disponibile</span>
                  <span className="text-sm font-black text-primary">{formatAmount(balance)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Limite mensile</span>
                  <span className="text-sm font-black text-primary">5.000,00 €</span>
                </div>
                <div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${spentPercent}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[11px] text-slate-400">{spentPercent.toFixed(1)}% utilizzato</span>
                    <span className="text-[11px] text-primary font-black">{formatAmount(balance)} € disponibili</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200/80 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-black text-primary">Attività Recente</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-slate-400">Nessuna attività recente</p>
                </div>
              ) : (
                transactions.map((tx) => {
                  const Icon = getIcon(tx.type);
                  const isCredit = tx.type === 'CREDIT' || tx.type === 'TRANSFER_IN';
                  return (
                    <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-primary">{tx.description}</p>
                          <p className="text-[11px] text-slate-400">{formatTime(tx.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${isCredit ? 'text-emerald-600' : 'text-primary'}`}>
                          {isCredit ? '+' : '-'}{formatAmount(tx.amount)} €
                        </p>
                        {tx.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-amber-600">
                            <Clock size={8} /> In sospeso
                          </span>
                        ) : tx.status === 'CANCELLED' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-slate-500">
                            Annullato
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-emerald-600">
                            <CheckCircle2 size={8} /> OK
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            {/* Card List */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
              <h3 className="text-xs font-black text-primary mb-3 px-2">Le mie Carte</h3>
              <div className="space-y-2">
                {cards.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCard(i)}
                    className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                      i === selectedCard
                        ? 'bg-slate-100 border border-secondary'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-6 rounded flex items-center justify-center text-[11px] font-black ${
                      i === 0 ? 'bg-primary text-secondary' : 'bg-accent text-white'
                    }`}>
                      {i === 0 ? 'FIS' : 'VRT'}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-black text-primary truncate">
                        {i === 0 ? 'Fisica' : 'Virtuale'} •• {c.number.slice(-4)}
                      </p>
                      <p className="text-[11px] text-slate-400">{c.holder}</p>
                    </div>
                    {i === selectedCard && <CheckCircle2 size={14} className="text-secondary shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
