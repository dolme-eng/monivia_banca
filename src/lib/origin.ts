const ALLOWED_ORIGINS = [
  'https://banca.monivia.it',
  'https://monivia.it',
  'https://www.monivia.it',
];

export function checkOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin || !host) return false;
  try {
    const originUrl = new URL(origin);
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    return originUrl.host === host;
  } catch {
    return false;
  }
}
