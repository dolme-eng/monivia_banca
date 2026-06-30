'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatTime } from '@/lib/format';
import {
  CheckCircle2,
  AlertTriangle,
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
  pendingAccounts: number;
  activeClients: number;
  newAccountsThisMonth: number;
  frozenCards: number;
  recentTransactions: any[];
  pendingList: any[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({
    totalAccounts: 0,
    pendingTransactions: 0,
    pendingAccounts: 0,
    activeClients: 0,
    newAccountsThisMonth: 0,
    frozenCards: 0,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-primary">Dashboard Amministrazione</h1>
          <p className="text-sm text-slate-500 mt-1">Panoramica dei conti e stato di sicurezza.</p>
        </div>
        <Link
          href="/admin/provision"
          className="flex items-center gap-2 bg-primary text-white px-4 py-3 min-h-[44px] rounded-lg text-sm font-black hover:bg-slate-800 transition-colors shrink-0"
        >
          <Plus size={14} />
          Nuovo Provisioning
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-400 hover:text-red-600">
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
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Conti Totali</p>
              <p className="text-xl font-black text-primary">{loading ? '—' : stats.totalAccounts}</p>
              <div className="flex items-center gap-1 mt-2 text-emerald-600">
                <TrendingUp size={12} />
                <span className="text-[11px] font-black">+{stats.newAccountsThisMonth} questo mese</span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Conti In Attesa</p>
              <p className="text-xl font-black text-amber-600">{loading ? '—' : stats.pendingAccounts}</p>
              {stats.pendingAccounts > 0 && (
                <div className="flex items-center gap-1 mt-2 text-amber-600">
                  <AlertTriangle size={12} />
                  <span className="text-[11px] font-black">Da validare</span>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Transazioni In Attesa</p>
              <p className="text-xl font-black text-primary">{loading ? '—' : stats.pendingTransactions}</p>
              {stats.pendingTransactions > 0 && (
                <div className="flex items-center gap-1 mt-2 text-amber-600">
                  <AlertTriangle size={12} />
                  <span className="text-[11px] font-black">Azione richiesta</span>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Clienti Attivi</p>
              <p className="text-xl font-black text-primary">{loading ? '—' : stats.activeClients}</p>
              <div className="flex items-center gap-1 mt-2 text-slate-400">
                <span className="text-[11px] font-black">Su {stats.totalAccounts} conti</span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Carte Congelate</p>
              <p className="text-xl font-black text-blue-600">{loading ? '—' : stats.frozenCards}</p>
              {stats.frozenCards > 0 && (
                <div className="flex items-center gap-1 mt-2 text-blue-600">
                  <AlertTriangle size={12} />
                  <span className="text-[11px] font-black">Da revisionare</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Pending Approvals */}
        <section className="md:col-span-3 lg:col-span-1 bg-white rounded-xl p-5 border border-slate-200/80" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black text-primary">Da Approvare</h3>
            <Link href="/admin/approvals" className="text-secondary text-[11px] font-black hover:underline py-2 px-1 min-h-[44px] flex items-center">
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
                      <p className="text-[11px] font-black text-primary">
                        {item.type === 'DEBIT' ? 'Prelievo' : item.type === 'TRANSFER_OUT' ? 'Trasferimento' : item.type}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {item.account?.user?.nome} {item.account?.user?.cognome}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-primary">
                    {Number(item.amount).toLocaleString('it-IT')} €
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
            <Link href="/admin/timeline" className="text-secondary text-xs font-black hover:underline py-2 px-1 min-h-[44px] flex items-center">
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
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center text-[11px] font-black text-secondary shrink-0">
                          {tx.account?.user?.nome?.[0] || '?'}{tx.account?.user?.cognome?.[0] || '?'}
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
                          tx.status === 'CANCELLED' ? 'bg-slate-100 text-slate-500' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {tx.status === 'APPROVED' ? 'Approvata' : tx.status === 'REJECTED' ? 'Rifiutata' : tx.status === 'CANCELLED' ? 'Annullata' : 'In Attesa'}
                        </span>
                      </td>
                      <td className="py-3 text-right font-black text-primary">
                        {Number(tx.amount).toLocaleString('it-IT')} €
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
                <p className="text-[11px] text-white/50">Provisioning prestito</p>
              </div>
              <ArrowRight size={12} className="ml-auto group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/admin/approvals" className="flex items-center gap-3 w-full p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <CheckCircle2 size={14} />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-primary">Approva Transazioni</p>
                <p className="text-[11px] text-slate-400">{stats.pendingTransactions} in sospeso</p>
              </div>
              <ArrowRight size={12} className="ml-auto text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/admin/timeline" className="flex items-center gap-3 w-full p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <Activity size={14} />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-primary">Timeline</p>
                <p className="text-[11px] text-slate-400">Stato transazioni</p>
              </div>
              <ArrowRight size={12} className="ml-auto text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
