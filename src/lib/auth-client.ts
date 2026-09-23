let refreshPromise: Promise<boolean> | null = null;
let cachedCsrf: string | null = null;

async function getCsrfToken(): Promise<string | null> {
  if (cachedCsrf) return cachedCsrf;
  try {
    const res = await fetch('/api/csrf');
    if (!res.ok) return null;
    const data = await res.json();
    cachedCsrf = data.csrfToken ?? null;
    return cachedCsrf;
  } catch {
    return null;
  }
}

export async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      // /api/auth/refresh requires a CSRF token — without it the call 403s
      // and silent auto-refresh never recovers the session.
      const csrf = await getCsrfToken();
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: csrf ? { 'x-csrf-token': csrf } : undefined,
      });
      if (res.status === 403) cachedCsrf = null; // stale token, refetch next time
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  let res = await fetch(url, init);

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await fetch(url, init);
    }
  }

  return res;
}
