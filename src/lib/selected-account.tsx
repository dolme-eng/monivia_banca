'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface AccountInfo {
  id: string;
  iban: string;
  balance: number;
  currency: string;
  status: string;
}

interface SelectedAccountContextType {
  accounts: AccountInfo[];
  selectedAccountId: string | null;
  selectedAccount: AccountInfo | null;
  setSelectedAccount: (id: string) => void;
  loading: boolean;
}

const SelectedAccountContext = createContext<SelectedAccountContextType>({
  accounts: [],
  selectedAccountId: null,
  selectedAccount: null,
  setSelectedAccount: () => {},
  loading: true,
});

export function useSelectedAccount() {
  return useContext(SelectedAccountContext);
}

export function SelectedAccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/account');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success && data.user?.accounts) {
            const accs = data.user.accounts.map((a: AccountInfo) => ({
              id: a.id,
              iban: a.iban,
              balance: a.balance,
              currency: a.currency,
              status: a.status,
            }));
            setAccounts(accs);

            const stored = localStorage.getItem('selectedAccountId');
            if (stored && accs.some((a: AccountInfo) => a.id === stored)) {
              setSelectedAccountId(stored);
            } else if (accs.length > 0) {
              setSelectedAccountId(accs[0].id);
            }
          }
        }
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const setSelectedAccount = useCallback((id: string) => {
    setSelectedAccountId(id);
    localStorage.setItem('selectedAccountId', id);
  }, []);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0] || null;

  return (
    <SelectedAccountContext.Provider value={{
      accounts,
      selectedAccountId: selectedAccountId || selectedAccount?.id || null,
      selectedAccount,
      setSelectedAccount,
      loading,
    }}>
      {children}
    </SelectedAccountContext.Provider>
  );
}
