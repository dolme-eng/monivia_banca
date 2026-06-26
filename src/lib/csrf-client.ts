let cachedToken: string | null = null;
let fetchPromise: Promise<string> | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (!fetchPromise) {
    fetchPromise = fetch('/api/csrf')
      .then((r) => r.json())
      .then((data) => {
        cachedToken = data.csrfToken;
        return cachedToken!;
      })
      .finally(() => {
        fetchPromise = null;
      });
  }
  return fetchPromise;
}

export async function csrfFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getCsrfToken();

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
      ...options.headers,
    },
  });

  // If CSRF expired, refresh and retry once
  if (res.status === 403) {
    cachedToken = null;
    const newToken = await getCsrfToken();
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': newToken,
        ...options.headers,
      },
    });
  }

  return res;
}
