import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const HMAC_ALGO = 'sha256';
// 30 minutes: CSRF tokens are minted per page load, no need for longer-lived ones.
// Not bound to a session by design (login/forgot flows need pre-auth tokens);
// short TTL + single-use-per-action patterns bound the replay window.
const TOKEN_TTL_MS = 30 * 60 * 1000;
// Clock-skew tolerance for future timestamps: tokens dated in the future
// beyond this are rejected (prevents arbitrary TTL extension).
const FUTURE_SKEW_MS = 5 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret) throw new Error('CSRF_SECRET must be set');
  return secret;
}

export function generateCsrfToken(): string {
  const secret = getSecret();
  const payload = `${Date.now()}:${randomBytes(16).toString('hex')}`;
  const sig = createHmac(HMAC_ALGO, secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function validateCsrfToken(token: string | null | undefined): boolean {
  if (!token) return false;

  const dotIndex = token.lastIndexOf('.');
  if (dotIndex === -1) return false;

  const payload = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);

  const secret = getSecret();
  const expected = createHmac(HMAC_ALGO, secret).update(payload).digest('hex');

  if (sig.length !== expected.length) return false;

  const sigBuf = Buffer.from(sig, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');

  if (!timingSafeEqual(sigBuf, expectedBuf)) return false;

  const ts = Number(payload.split(':')[0]);
  if (isNaN(ts)) return false;
  const age = Date.now() - ts;
  if (age > TOKEN_TTL_MS) return false;
  if (age < -FUTURE_SKEW_MS) return false;

  return true;
}
