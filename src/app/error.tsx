'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

/**
 * Error boundary for every route below the root layout.
 *
 * Without it, any client-side error escaped to the browser and surfaced as
 * Chrome's raw "This page couldn't load" — no way back, no explanation, on
 * every page of the app. This is the net that was missing.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Details stay in the server logs; the user gets an actionable message.
    console.error('[app-error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-red-50 flex items-center justify-center">
          <AlertTriangle size={28} className="text-red-500" />
        </div>

        <h1 className="text-xl font-black text-primary mb-2">
          Questa pagina non si è caricata
        </h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Qualcosa è andato storto durante il caricamento. I tuoi dati non sono
          stati modificati.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-secondary text-primary text-sm font-black hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            Riprova
          </button>
          <Link
            href="/dashboard"
            className="w-full min-h-[44px] px-4 py-3 rounded-xl border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Torna alla dashboard
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 text-[11px] text-slate-400">
            Riferimento: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
