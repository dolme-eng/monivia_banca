import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl font-black text-red-500">404</span>
        </div>
        <h1 className="text-2xl font-black text-primary mb-3">Pagina non trovata</h1>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          La pagina che stai cercando non esiste o è stata spostata.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-black rounded-xl hover:bg-primary/90 transition-colors"
        >
          Torna alla Home
        </Link>
      </div>
    </div>
  );
}
