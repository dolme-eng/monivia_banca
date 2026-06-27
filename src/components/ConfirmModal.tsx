'use client';

import { useEffect, useRef } from 'react';
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
}: ConfirmModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
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

  if (!open) return null;

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
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute right-3 top-3 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
        >
          <X size={16} />
        </button>

        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-4`}>
          <AlertTriangle size={24} className={colors.icon} />
        </div>

        <h3 className="text-lg font-black text-primary mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">{message}</p>

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
            disabled={loading}
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
