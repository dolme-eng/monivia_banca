'use client';

import { useState, useEffect } from 'react';

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  accountStatus?: string;
}

interface Session {
  user: SessionUser | null;
}

export function useMySession(selectedAccountId?: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<{ id: string; status: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/account');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success) {
            setAccounts(data.user.accounts || []);
            setSession({
              user: {
                id: data.user.id || '',
                name: `${data.user.nome} ${data.user.cognome}`,
                email: data.user.email,
                role: data.user.role || 'USER',
              },
            });
          }
        } else if (res.status === 401) {
          window.location.replace('/login');
        }
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // The status must describe the account the client is looking at. It used to
  // come from `accounts[0]` on every render, so a user with two accounts (one
  // PENDING, one ACTIVE) lost their whole navigation because of an account
  // they were not viewing.
  const active =
    accounts.find((a) => a.id === selectedAccountId) || accounts[0] || null;

  return {
    data: session
      ? { user: { ...session.user, accountStatus: active?.status } }
      : null,
    status: loading ? 'loading' : session ? 'authenticated' : 'unauthenticated',
  };
}
