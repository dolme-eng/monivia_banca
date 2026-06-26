'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  User,
  Mail,
  Shield,
  Lock,
  Fingerprint,
  Bell,
  ChevronRight,
  Key,
  Loader2,
} from 'lucide-react';

interface UserData {
  nome: string;
  cognome: string;
  email: string;
  role: string;
  accounts: { id: string; iban: string; balance: number }[];
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/user/account');
        const data = await res.json();
        if (data.success) setUser(data.user);
      } catch {} finally {
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

  const initials = user
    ? `${user.nome[0]}${user.cognome[0]}`.toUpperCase()
    : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-primary">Impostazioni e Sicurezza</h1>
        <p className="text-sm text-slate-500 mt-1">Gestisci il tuo profilo, la sicurezza e le preferenze.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-primary flex items-center gap-2">
              <User size={16} className="text-secondary" />
              Informazioni Profilo
            </h2>
            <button className="text-secondary text-xs font-black hover:underline">Modifica</button>
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-xl font-black">
              {initials}
            </div>
            <div>
              <p className="text-lg font-black text-primary">{user?.nome} {user?.cognome}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Nome</label>
              <p className="text-sm font-black text-primary">{user?.nome ?? '—'}</p>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Cognome</label>
              <p className="text-sm font-black text-primary">{user?.cognome ?? '—'}</p>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Email</label>
              <p className="text-sm font-black text-primary">{user?.email ?? '—'}</p>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Ruolo</label>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-secondary/10 text-secondary text-[10px] font-black uppercase">
                {user?.role === 'ADMIN' ? 'Amministratore' : 'Cliente'}
              </span>
            </div>
            {user?.accounts?.[0] && (
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">IBAN</label>
                <p className="text-sm font-black text-primary font-mono">{user.accounts[0].iban}</p>
              </div>
            )}
          </div>
        </div>

        {/* Daily Limits */}
        <div className="lg:col-span-4 bg-primary text-white rounded-xl p-6 shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-secondary/10 rounded-full blur-3xl transition-all" aria-hidden />
          <div className="relative z-10">
            <h2 className="text-xs font-black text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
              Limiti Giornalieri
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-white/60">Trasferimento</span>
                  <span className="font-black">0 / 10.000 €</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full shadow-[0_0_8px_rgba(0,212,255,0.5)]" style={{ width: '0%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-white/60">Prelievo</span>
                  <span className="font-black">0 / 2.500 €</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
            </div>
          </div>
          <button className="mt-5 w-full py-2 border border-white/20 rounded-lg text-xs font-black hover:bg-white/10 transition-colors relative z-10">
            Richiedi Aumento
          </button>
        </div>

        {/* Security Center */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-sm font-black text-primary mb-5 flex items-center gap-2">
            <Shield size={16} className="text-secondary" />
            Sicurezza e Accesso
          </h2>
          <div className="space-y-3">
            {[
              { icon: Lock, title: 'Autenticazione a Due Fattori (2FA)', desc: 'Notifiche push via Monivia Authenticator', status: 'Attiva', statusColor: 'bg-emerald-50 text-emerald-600' },
              { icon: Key, title: 'Password', desc: 'Ultima modifica oggi', status: null, statusColor: '' },
              { icon: Fingerprint, title: 'Accesso Biometrico', desc: 'TouchID / FaceID per accesso mobile', status: 'Disattivato', statusColor: 'bg-slate-100 text-slate-400' },
            ].map(({ icon: Icon, title, desc, status, statusColor }) => (
              <div key={title} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-primary">{title}</p>
                    <p className="text-[10px] text-slate-400">{desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {status && (
                    <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase ${statusColor}`}>
                      {status}
                    </span>
                  )}
                  <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-sm font-black text-primary mb-5 flex items-center gap-2">
            <Bell size={16} className="text-secondary" />
            Preferenze Notifiche
          </h2>
          <div className="space-y-5">
            {[
              { label: 'Notifiche push', desc: 'Avvisi in tempo reale per transazioni', on: true },
              { label: 'Email riepilogative', desc: 'Report mensili di riconciliazione', on: true },
              { label: 'Newsletter', desc: 'Suggerimenti e aggiornamenti prodotto', on: false },
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
          <div className="mt-5 p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <p className="text-[10px] text-slate-400 text-center italic">
              Le notifiche di sistema critiche non possono essere disattivate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
