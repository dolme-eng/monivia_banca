'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth-client';
import { csrfFetch } from '@/lib/csrf-client';
import { useSelectedAccount } from '@/lib/selected-account';
import {
  User,
  Shield,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  Key,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface UserData {
  nome: string;
  cognome: string;
  email: string;
  role: string;
  accounts: { id: string; iban: string; balance: number }[];
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { selectedAccountId } = useSelectedAccount();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

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
          setError('Impossibile caricare le impostazioni.');
        }
      } catch {
        setError('Errore di connessione.');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword !== confirmPassword) {
      setPwError('Le password non coincidono.');
      return;
    }

    if (newPassword === currentPassword) {
      setPwError('La nuova password deve essere diversa da quella attuale.');
      return;
    }

    setPwLoading(true);
    try {
      const res = await csrfFetch('/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPwSuccess('Password aggiornata con successo.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwError(data.error || 'Errore durante il cambio password.');
      }
    } catch {
      setPwError('Errore di connessione.');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-secondary" />
      </div>
    );
  }

  if (!user && !error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <User size={32} className="text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-black text-primary mb-2">Nessun dato disponibile</h2>
          <p className="text-sm text-slate-500">Impossibile caricare le impostazioni del profilo.</p>
        </div>
      </div>
    );
  }

  const initials = user
    ? `${user.nome[0]}${user.cognome[0]}`.toUpperCase()
    : '—';

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-black text-red-600">
          {error}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-primary">Impostazioni e Sicurezza</h1>
        <p className="text-sm text-slate-500 mt-1">Gestisci il tuo profilo, la sicurezza e le preferenze.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-primary flex items-center gap-2">
              <User size={16} className="text-secondary" />
              Informazioni Profilo
            </h2>
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
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mb-1">Nome</label>
              <p className="text-sm font-black text-primary">{user?.nome ?? '—'}</p>
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mb-1">Cognome</label>
              <p className="text-sm font-black text-primary">{user?.cognome ?? '—'}</p>
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mb-1">Email</label>
              <p className="text-sm font-black text-primary">{user?.email ?? '—'}</p>
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mb-1">Ruolo</label>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-secondary/10 text-secondary text-[11px] font-black uppercase">
                {user?.role === 'ADMIN' ? 'Amministratore' : 'Cliente'}
              </span>
            </div>
            {user?.accounts?.find((a) => a.id === selectedAccountId) && (
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mb-1">IBAN</label>
                <p className="text-sm font-black text-primary font-mono truncate">{user.accounts.find((a) => a.id === selectedAccountId)?.iban}</p>
              </div>
            )}
          </div>
        </div>

        {/* Change Password */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h2 className="text-sm font-black text-primary mb-5 flex items-center gap-2">
              <Key size={16} className="text-secondary" />
              Cambia Password
            </h2>

            {pwSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2" role="status">
                <CheckCircle2 size={14} />
                {pwSuccess}
              </div>
            )}

            {pwError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2" role="alert">
                <AlertCircle size={14} />
                {pwError}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Password attuale *
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary pr-10"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600"
                    aria-label={showCurrent ? 'Nascondi' : 'Mostra'}
                  >
                    {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Nuova password *
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimo 8 caratteri"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600"
                    aria-label={showNew ? 'Nascondi' : 'Mostra'}
                  >
                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Conferma nuova password *
                </label>
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ripeti la nuova password"
                />
              </div>

              <button
                type="submit"
                disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-black hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                {pwLoading ? 'Aggiornamento...' : 'Aggiorna Password'}
              </button>
            </form>
          </div>

          {/* Security Center */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h2 className="text-sm font-black text-primary mb-5 flex items-center gap-2">
              <Shield size={16} className="text-secondary" />
              Centro Sicurezza
            </h2>
            <div className="space-y-3">
              {[
                { icon: Lock, title: 'Blocco Account', desc: 'Blocco automatico dopo 5 tentativi falliti', status: 'Attivo', statusColor: 'bg-emerald-50 text-emerald-600' },
                { icon: Shield, title: 'Token di Sessione', desc: 'Scadenza: 15 minuti + refresh automatico', status: 'Attivo', statusColor: 'bg-emerald-50 text-emerald-600' },
              ].map(({ icon: Icon, title, desc, status, statusColor }) => (
                <div key={title} className="flex items-center justify-between p-4 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-primary">{title}</p>
                      <p className="text-[11px] text-slate-400">{desc}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[11px] font-black rounded uppercase ${statusColor}`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
