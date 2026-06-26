'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { csrfFetch } from '@/lib/csrf-client';

export default function ApprovalsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/transactions');
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleAction = async (transactionId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await csrfFetch('/api/admin/transactions', {
        method: 'POST',
        body: JSON.stringify({ transactionId, action }),
      });
      if (res.ok) {
        await fetchTransactions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section className="section-pad">
      <div className="site-container">
        {/* Titre */}
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <h2 className="section-heading">Centro di <span className="text-gradient-cyan">Validazione</span></h2>
          <p className="section-copy mt-5">
            Controllo e approvazione dei movimenti finanziari. Ogni prelievo o trasferimento deve essere validato.
          </p>
        </div>

        {loading ? (
          <div className="surface-card p-20 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
            <p className="text-sm text-slate-500">Caricamento transazioni...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="surface-card p-20 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="mb-2 text-xl font-black text-primary">Nessuna transazione in sospeso</h3>
            <p className="text-sm text-slate-500">Tutte le richieste sono state elaborate.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="surface-card flex flex-col gap-4 p-5 sm:p-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-primary">
                    {tx.type === 'TRANSFER_OUT' ? '⇄' : '↓'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black uppercase text-white">
                        {tx.type}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{tx.id}</span>
                    </div>
                    <p className="font-black text-primary">{tx.description}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Conto: <span className="font-mono">{tx.account.iban}</span>
                      {' '}&middot;{' '}
                      Cliente: {tx.account.user.nome} {tx.account.user.cognome}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 pl-14 sm:pl-0">
                  <p className="text-xl font-black text-red-600">{tx.amount} €</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(tx.id, 'REJECT')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-500 transition-all hover:border-red-300 hover:text-red-600"
                    >
                      <XCircle size={14} />
                      Rifiuta
                    </button>
                    <button
                      onClick={() => handleAction(tx.id, 'APPROVE')}
                      className="btn-primary px-4 py-2.5 text-xs"
                    >
                      <CheckCircle2 size={14} />
                      Approva
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
