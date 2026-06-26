import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET;

if (!CSRF_SECRET) {
  throw new Error('CSRF_SECRET or NEXTAUTH_SECRET must be set');
}

const HMAC_ALGO = 'sha256';
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export function generateCsrfToken(): string {
  const payload = `${Date.now()}:${randomBytes(16).toString('hex')}`;
  const sig = createHmac(HMAC_ALGO, CSRF_SECRET!).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function validateCsrfToken(token: string | null | undefined): boolean {
  if (!token) return false;

  const dotIndex = token.lastIndexOf('.');
  if (dotIndex === -1) return false;

  const payload = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);

  const expected = createHmac(HMAC_ALGO, CSRF_SECRET!).update(payload).digest('hex');

  if (sig.length !== expected.length) return false;

  const sigBuf = Buffer.from(sig, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');

  if (!timingSafeEqual(sigBuf, expectedBuf)) return false;

  const ts = Number(payload.split(':')[0]);
  if (isNaN(ts) || Date.now() - ts > TOKEN_TTL_MS) return false;

  return true;
}
