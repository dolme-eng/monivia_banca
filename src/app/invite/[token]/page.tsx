'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  Copy,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface InviteData {
  email: string;
  password: string;
  nome: string;
  cognome: string;
  expiresAt: string;
}

export default function InvitePage() {
  const params = useParams();
  const token = params.token as string;
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/invites/${token}`);
        const data = await res.json();
        if (data.success) {
          setInvite(data.invite);
        } else {
          setError(data.error || 'Invito non valido');
        }
      } catch {
        setError('Errore di connessione');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchInvite();
  }, [token]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const copyAll = () => {
    if (!invite) return;
    const text = `Email: ${invite.email}\nPassword: ${invite.password}\n\nAccedi a: ${window.location.origin}/login`;
    copyToClipboard(text, 'all');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-secondary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h1 className="text-xl font-black text-primary mb-2">Invito non valido</h1>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl text-sm font-black hover:bg-slate-800 transition-colors">
            Vai al Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl font-black tracking-tight text-primary">
              MO<span className="text-secondary">NIVIA</span>
            </span>
            <span className="relative -top-2 text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
              Banca
            </span>
          </div>
          <h1 className="text-xl font-black text-primary">Le tue credenziali</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ecco i dati per accedere alla tua piattaforma bancaria.
          </p>
        </div>

        {/* Credentials Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="bg-primary p-6 text-center">
            <CreditCard size={40} className="text-secondary mx-auto mb-3" />
            <p className="text-sm text-white/60">Benvenut{invite?.nome ? 'o' : 'a'}</p>
            <p className="text-lg font-black text-white">{invite?.nome} {invite?.cognome}</p>
          </div>

          <div className="p-6 space-y-4">
            {/* Email */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 block mb-1">Email</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono text-primary">
                  {invite?.email}
                </div>
                <button
                  onClick={() => copyToClipboard(invite?.email || '', 'email')}
                  className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  aria-label="Copia email"
                >
                  {copied === 'email' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-400" />}
                </button>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 block mb-1">Password</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono text-primary">
                  {invite?.password}
                </div>
                <button
                  onClick={() => copyToClipboard(invite?.password || '', 'password')}
                  className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  aria-label="Copia password"
                >
                  {copied === 'password' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-400" />}
                </button>
              </div>
            </div>

            {/* Copy All */}
            <button
              onClick={copyAll}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 text-primary py-3 rounded-xl text-sm font-black hover:bg-slate-200 transition-colors min-h-[44px]"
            >
              {copied === 'all' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
              Copia tutto
            </button>
          </div>
        </div>

        {/* Login Button */}
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 w-full bg-primary text-white py-4 rounded-xl text-sm font-black hover:bg-slate-800 transition-colors min-h-[48px]"
        >
          Accedi al tuo conto
          <ExternalLink size={14} />
        </Link>

        {/* Expiry notice */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Clock size={12} />
          Questo link scade tra 24 ore
        </div>
      </div>
    </div>
  );
}
