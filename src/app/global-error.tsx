'use client';

/**
 * Last-resort boundary for errors in the root layout itself, where the route
 * error boundary cannot render (it is mounted inside that layout). Must render
 * its own <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it">
      <body>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <h1 className="text-xl font-black text-slate-800 mb-2">
              Errore dell&apos;applicazione
            </h1>
            <p className="text-sm text-slate-600 mb-6">
              Si è verificato un problema inatteso. Riprova tra un momento.
            </p>
            <button
              onClick={() => reset()}
              className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-slate-800 text-white text-sm font-black hover:bg-slate-900 transition-colors"
            >
              Riprova
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
