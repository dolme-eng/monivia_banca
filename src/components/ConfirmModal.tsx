'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  /**
   * When set, the confirm button stays disabled until this value matches
   * `expected` (ignoring case and spaces). Used for irreversible actions so a
   * stray click cannot destroy something: the operator must retype the IBAN.
   */
  requireTyped?: string;
  expected?: string;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
  requireTyped,
  expected,
}: ConfirmModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState('');

  // Every hook must run on every render, unconditionally. Placing `useState` or
  // `useEffect` after the `if (!open) return null` below changes the hook count
  // between the closed and open state, and React throws
  // "Rendered more hooks than during the previous render" the moment the dialog
  // opens — which is every confirmation flow in the app (withdrawal, transfer,
  // approval, purge). This component stays mounted with `open={false}`, so the
  // transition always happens on the same instance.

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      // Move focus into the dialog on open (screen readers + keyboard users)
      dialogRef.current?.focus();
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, loading, onCancel]);

  // Clear the typed value every time the dialog opens so a previous confirmation
  // cannot pre-fill the next destructive one.
  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  if (!open) return null;

  const normalizeIban = (v: string) => v.replace(/\s+/g, '').toUpperCase();
  const typedOk = !requireTyped || normalizeIban(typed) === normalizeIban(expected || '');

  const colors = {
    danger: { bg: 'bg-red-50', icon: 'text-red-500', btn: 'bg-red-600 hover:bg-red-700' },
    warning: { bg: 'bg-amber-50', icon: 'text-amber-500', btn: 'bg-amber-600 hover:bg-amber-700' },
    info: { bg: 'bg-secondary/10', icon: 'text-secondary', btn: 'bg-secondary text-primary hover:bg-secondary/90' },
  }[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !loading && onCancel()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl outline-none"
      >
        <button
          onClick={onCancel}
          disabled={loading}
          aria-label="Chiudi finestra di dialogo"
          className="absolute right-3 top-3 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
        >
          <X size={16} />
        </button>

        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-4`}>
          <AlertTriangle size={24} className={colors.icon} />
        </div>

        <h3 id="confirm-modal-title" className="text-lg font-black text-primary mb-2">{title}</h3>
        <p id="confirm-modal-message" className="text-sm text-slate-500 mb-6 leading-relaxed">{message}</p>

        {requireTyped && (
          <div className="mb-6">
            <label htmlFor="confirm-typed" className="block text-xs font-black text-slate-600 mb-1.5">
              Digita <span className="font-mono text-primary">{expected}</span> per confermare
            </label>
            <input
              id="confirm-typed"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
              placeholder={expected}
              className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-slate-200 font-mono text-sm text-primary focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-3 min-h-[44px] rounded-xl border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !typedOk}
            className={`flex-1 px-4 py-3 min-h-[44px] rounded-xl text-sm font-black text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${colors.btn}`}
          >
            {loading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
