'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Plus,
  UserPlus,
  Activity,
  CreditCard,
  Send,
  AlertCircle,
  XCircle,
} from 'lucide-react';

interface AdminStats {
  totalAccounts: number;
  pendingTransactions: number;
  activeClients: number;
  newAccountsThisMonth: number;
  recentTransactions: any[];
  pendingList: any[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({
    totalAccounts: 0,
    pendingTransactions: 0,
    activeClients: 0,
    newAccountsThisMonth: 0,
    recentTransactions: [],
    pendingList: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats');
        if (!res.ok) throw new Error('Errore del server');
        const data = await res.json();
        if (data.totalAccounts !== undefined) {
          setStats(data);
          setError(null);
        }
      } catch {
        setError('Impossibile caricare le statistiche');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Adesso';
    if (mins < 60) return `${mins} min fa`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ore fa`;
    return `${Math.floor(hours / 24)} giorni fa`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-primary">Dashboard Amministrazione</h1>
          <p className="text-sm text-slate-500 mt-1">Panoramica dei conti e stato di sicurezza.</p>
        </div>
        <Link
          href="/admin/provision"
          className="hidden sm:flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-black hover:bg-slate-800 transition-colors"
        >
          <Plus size={14} />
          Nuovo Provisioning
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Metrics */}
        <section className="md:col-span-3 lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80 flex flex-col justify-between" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-black text-primary mb-4 flex items-center gap-2">
            <Activity size={16} className="text-secondary" />
            Panoramica Generale
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Conti Totali</p>
              <p className="text-xl font-black text-primary">{loading ? '—' : stats.totalAccounts}</p>
              <div className="flex items-center gap-1 mt-2 text-emerald-600">
                <TrendingUp size={12} />
                <span className="text-[10px] font-black">+{stats.newAccountsThisMonth} questo mese</span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">In Attesa</p>
              <p className="text-xl font-black text-primary">{loading ? '—' : stats.pendingTransactions}</p>
              <div className="flex items-center gap-1 mt-2 text-amber-600">
                <AlertTriangle size={12} />
                <span className="text-[10px] font-black">Azione richiesta</span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Clienti Attivi</p>
              <p className="text-xl font-black text-primary">{loading ? '—' : stats.activeClients}</p>
              <div className="flex items-center gap-1 mt-2 text-slate-400">
                <span className="text-[10px] font-black">Su {stats.totalAccounts} conti</span>
              </div>
            </div>
          </div>
        </section>

        {/* Security Status */}
        <section className="md:col-span-3 lg:col-span-1 bg-white rounded-xl p-5 border border-slate-200/80 flex flex-col justify-between relative overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-secondary/10 rounded-full blur-xl" aria-hidden />
          <h3 className="text-sm font-black text-primary mb-4 flex items-center gap-2 relative z-10">
            <ShieldCheck size={16} className="text-secondary" />
            Sicurezza
          </h3>
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Stato Sistema</span>
              <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Ottimale
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">Autenticazione</span>
                <span className="text-sm font-black text-primary">NextAuth</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-secondary h-full rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">JWT + bcrypt + CSRF attivo.</p>
          </div>
        </section>

        {/* Pending Approvals */}
        <section className="md:col-span-3 lg:col-span-1 bg-white rounded-xl p-5 border border-slate-200/80" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black text-primary">Da Approvare</h3>
            <Link href="/admin/approvals" className="text-secondary text-[10px] font-black hover:underline">
              Vedi tutte
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
            </div>
          ) : stats.pendingList.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Nessuna transazione in sospeso</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.pendingList.map((item: any) => (
                <Link
                  key={item.id}
                  href={`/admin/prelievo/${item.id}`}
                  className="p-3 bg-slate-50 rounded-lg flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer block"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                      {item.type === 'DEBIT' || item.type === 'TRANSFER_OUT' ? (
                        <Send size={14} />
                      ) : (
                        <CreditCard size={14} />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-primary">
                        {item.type === 'DEBIT' ? 'Prelievo' : item.type === 'TRANSFER_OUT' ? 'Trasferimento' : item.type}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {item.account?.user?.nome} {item.account?.user?.cognome}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-primary">
                    {Math.abs(item.amount).toLocaleString('it-IT')} €
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <section className="md:col-span-3 lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80 flex flex-col" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black text-primary">Attività Recenti</h3>
            <Link href="/admin/approvals" className="text-secondary text-xs font-black hover:underline">
              Vedi tutto
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
            </div>
          ) : stats.recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Activity size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Nessuna attività recente</p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1 -mx-5 px-5">
              <div className="min-w-[600px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <th className="pb-2 font-medium">Cliente</th>
                    <th className="pb-2 font-medium">Tipo</th>
                    <th className="pb-2 font-medium">Stato</th>
                    <th className="pb-2 font-medium text-right">Importo</th>
                    <th className="pb-2 font-medium text-right">Tempo</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-50">
                  {stats.recentTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                      <td className="py-3 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center text-[11px] font-black text-secondary shrink-0">
                          {tx.account?.user?.nome?.[0]}{tx.account?.user?.cognome?.[0]}
                        </div>
                        {tx.account?.user?.nome} {tx.account?.user?.cognome}
                      </td>
                      <td className="py-3 text-slate-500">
                        {tx.type === 'DEBIT' ? 'Prelievo' : tx.type === 'TRANSFER_OUT' ? 'Trasferimento' : tx.type}
                      </td>
                      <td className="py-3">
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded ${
                          tx.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                          tx.status === 'REJECTED' ? 'bg-red-50 text-red-500' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {tx.status === 'APPROVED' ? 'OK' : tx.status === 'REJECTED' ? 'NO' : '...'}
                        </span>
                      </td>
                      <td className="py-3 text-right font-black text-primary">
                        {Math.abs(tx.amount).toLocaleString('it-IT')} €
                      </td>
                      <td className="py-3 text-right text-slate-500 text-[11px]">
                        {formatTime(tx.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="md:col-span-3 lg:col-span-1 bg-white rounded-xl p-5 border border-slate-200/80" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-black text-primary mb-4">Azioni Rapide</h3>
          <div className="flex flex-col gap-2">
            <Link href="/admin/provision" className="flex items-center gap-3 w-full p-3 bg-primary text-white rounded-xl hover:bg-slate-800 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0">
                <UserPlus size={14} />
              </div>
              <div className="text-left">
                <p className="text-xs font-black">Nuovo Conto</p>
                <p className="text-[9px] text-white/50">Provisioning prestito</p>
              </div>
              <ArrowRight size={12} className="ml-auto group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/admin/approvals" className="flex items-center gap-3 w-full p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <CheckCircle2 size={14} />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-primary">Approva Transazioni</p>
                <p className="text-[9px] text-slate-400">{stats.pendingTransactions} in sospeso</p>
              </div>
              <ArrowRight size={12} className="ml-auto text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/admin/timeline" className="flex items-center gap-3 w-full p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <Activity size={14} />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-primary">Timeline</p>
                <p className="text-[9px] text-slate-400">Stato transazioni</p>
              </div>
              <ArrowRight size={12} className="ml-auto text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
