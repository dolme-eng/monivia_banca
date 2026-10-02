'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { csrfFetch } from '@/lib/csrf-client';

interface Notification {
  key: string;
  title: string;
  detail: string;
  createdAt: string;
  href: string;
  tone: 'info' | 'success' | 'warning';
}

const TONE = {
  info: { icon: Info, color: 'text-secondary bg-secondary/10' },
  success: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  warning: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
} as const;

/**
 * Client notifications, fetched once per page change (no polling, by design).
 *
 * Unread state comes from the server via NotificationSeen; opening the panel
 * marks what is on screen as read, so the badge only reflects what the client
 * has not looked at yet.
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/notifications')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.success) setUnread(data.notifications || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Escape closes, and a click outside dismisses the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const openPanel = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread.length > 0) {
      setLoading(true);
      try {
        await csrfFetch('/api/user/notifications', { method: 'POST' });
        setUnread([]);
      } catch {
        /* keep the list visible if marking read fails */
      } finally {
        setLoading(false);
      }
    }
  };

  const count = unread.length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={openPanel}
        aria-label={
          count > 0
            ? `Notifiche, ${count} non lette`
            : 'Notifiche, nessuna non letta'
        }
        aria-expanded={open}
        aria-haspopup="true"
        className="relative p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-600 hover:text-secondary transition-colors"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 bg-amber-500 rounded-full text-[11px] font-black text-primary flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifiche"
          className="absolute right-0 top-full mt-1 w-[min(22rem,calc(100vw-2rem))] bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-black text-primary">Notifiche</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Chiudi notifiche"
              className="p-2 -mr-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-600 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>

          {loading ? (
            <p className="px-4 py-6 text-sm text-slate-600 text-center">Caricamento…</p>
          ) : unread.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-600 text-center">
              Nessuna notifica.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {unread.map((n) => {
                const { icon: Icon, color } = TONE[n.tone];
                return (
                  <li key={n.key}>
                    <button
                      onClick={() => {
                        setOpen(false);
                        router.push(n.href);
                      }}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${color}`}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-primary">
                          {n.title}
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5">
                          {n.detail}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
