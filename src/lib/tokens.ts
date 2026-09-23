import { createHash, randomBytes } from 'node:crypto';

/**
 * Opaque bearer tokens (refresh, password-reset, invite) are stored in the
 * database ONLY as SHA-256 hashes. A DB dump must never yield replayable
 * tokens. The raw value is returned to the caller exactly once (cookie or
 * emailed link) and never persisted.
 */
export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
