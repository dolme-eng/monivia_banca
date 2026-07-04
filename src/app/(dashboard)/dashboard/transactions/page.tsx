'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  History,
} from 'lucide-react';
import { authFetch } from '@/lib/auth-client';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  reference: string | null;
  category: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const TYPE_CONFIG: Record<string, { icon: typeof ArrowUpRight; color: string; label: string }> = {
  CREDIT: { icon: ArrowDownLeft, color: 'text-emerald-500', label: 'Accredito' },
  DEBIT: { icon: ArrowUpRight, color: 'text-red-500', label: 'Addebito' },
  TRANSFER_IN: { icon: ArrowDownLeft, color: 'text-emerald-500', label: 'Bonifico ricevuto' },
  TRANSFER_OUT: { icon: ArrowUpRight, color: 'text-red-500', label: 'Bonifico inviato' },
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  PENDING: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'In attesa' },
  APPROVED: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'Approvata' },
  REJECTED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Rifiutata' },
  CANCELLED: { icon: AlertCircle, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', label: 'Annullata' },
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const fetchTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);

      const res = await authFetch(`/api/user/transactions?${params}`);
      if (res.status === 401) {
        window.location.replace('/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
        setPagination(data.pagination);
      }
    } catch {
      console.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  const formatAmount = (amount: number, type: string) => {
    const formatted = Math.abs(amount).toLocaleString('it-IT', { minimumFractionDigits: 2 });
    return isPositive(type) ? `+${formatted} €` : `-${formatted} €`;
  };

  const isPositive = (type: string) => type === 'CREDIT' || type === 'TRANSFER_IN';

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-primary flex items-center gap-2">
          <History size={24} className="text-secondary" />
          Storico Movimenti
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Consulta tutti i movimenti del tuo conto.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Tipo:</span>
          </div>
          {['ALL', 'CREDIT', 'DEBIT', 'TRANSFER_IN', 'TRANSFER_OUT'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-colors ${
                typeFilter === t
                  ? 'bg-secondary text-primary'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL' ? 'Tutti' : TYPE_CONFIG[t]?.label || t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Stato:</span>
          </div>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-colors ${
                statusFilter === s
                  ? 'bg-secondary text-primary'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {s === 'ALL' ? 'Tutti' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-secondary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16">
            <History size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Nessun movimento trovato</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-50">
              {transactions.map((tx) => {
                const typeConf = TYPE_CONFIG[tx.type] || TYPE_CONFIG.CREDIT;
                const statusConf = STATUS_CONFIG[tx.status] || STATUS_CONFIG.PENDING;
                const Icon = typeConf.icon;
                const StatusIcon = statusConf.icon;
                const positive = isPositive(tx.type);

                return (
                  <div key={tx.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${positive ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <Icon size={16} className={typeConf.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-primary truncate">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400">{formatDate(tx.createdAt)}</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black border ${statusConf.bg} ${statusConf.color}`}>
                          <StatusIcon size={10} />
                          {statusConf.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatAmount(tx.amount, tx.type)}
                      </p>
                      {tx.reference && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.reference}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  {pagination.total} movimenti — pagina {pagination.page} di {pagination.pages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchTransactions(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const start = Math.max(1, pagination.page - 2);
                    const pageNum = start + i;
                    if (pageNum > pagination.pages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => fetchTransactions(pageNum)}
                        className={`p-2 min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg text-xs font-black transition-colors ${
                          pageNum === pagination.page
                            ? 'bg-secondary text-primary'
                            : 'border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => fetchTransactions(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="p-2 min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
