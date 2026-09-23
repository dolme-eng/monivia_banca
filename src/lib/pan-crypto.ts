import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

/**
 * AES-256-GCM encryption for card PANs.
 * CARD_PAN_SECRET must be 64 hex chars (32 bytes). Generate with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * The secret is NEVER stored in the repo — Vercel env + local .env only.
 * Stored format: ivHex:cipherHex:tagHex
 */
function getKey(): Buffer {
  const secret = process.env.CARD_PAN_SECRET;
  if (!secret || !/^[0-9a-fA-F]{64}$/.test(secret)) {
    throw new Error('CARD_PAN_SECRET must be set (64 hex chars)');
  }
  return Buffer.from(secret, 'hex');
}

export function encryptPan(pan: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(pan, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${enc.toString('hex')}:${cipher.getAuthTag().toString('hex')}`;
}

export function decryptPan(payload: string): string {
  const [ivHex, encHex, tagHex] = payload.split(':');
  if (!ivHex || !encHex || !tagHex) throw new Error('Malformed PAN payload');
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
}

/** Display grouping: 1234567812345678 -> 1234 5678 1234 5678 */
export function formatPan(pan: string): string {
  return pan.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/**
 * Uniqueness fingerprint for the PAN. HMAC-SHA256 keyed with CARD_PAN_SECRET
 * so a DB dump cannot be brute-forced offline the way a plain SHA-256 could
 * (16 digits + Luhn + known last4 is GPU-searchable). Falls back to plain
 * SHA-256 only when the secret is missing — same degradation policy as panEnc.
 */
export function hashPan(pan: string): string {
  const secret = process.env.CARD_PAN_SECRET;
  if (secret && /^[0-9a-fA-F]{64}$/.test(secret)) {
    return createHmac('sha256', Buffer.from(secret, 'hex')).update(pan, 'utf8').digest('hex');
  }
  console.error('CARD_PAN_SECRET missing — card fingerprint not HMACed');
  return createHash('sha256').update(pan, 'utf8').digest('hex');
}
