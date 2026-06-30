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

export function useMySession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/account');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success) {
            setSession({
              user: {
                id: data.user.id || '',
                name: `${data.user.nome} ${data.user.cognome}`,
                email: data.user.email,
                role: data.user.role || 'USER',
                accountStatus: data.user.accounts?.[0]?.status,
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

  return { data: session, status: loading ? 'loading' : session ? 'authenticated' : 'unauthenticated' };
}
