import { describe, it, expect, beforeEach } from 'vitest';

const TEST_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('pan-crypto', () => {
  beforeEach(() => {
    process.env.CARD_PAN_SECRET = TEST_SECRET;
  });

  it('round-trips encrypt -> decrypt', async () => {
    const { encryptPan, decryptPan } = await import('./pan-crypto');
    const pan = '5927435382278304';
    expect(decryptPan(encryptPan(pan))).toBe(pan);
  });

  it('produces different ciphertexts for the same PAN (random IV)', async () => {
    const { encryptPan } = await import('./pan-crypto');
    expect(encryptPan('5927435382278304')).not.toBe(encryptPan('5927435382278304'));
  });

  it('rejects tampered payloads', async () => {
    const { encryptPan, decryptPan } = await import('./pan-crypto');
    const [iv, enc, tag] = encryptPan('5927435382278304').split(':');
    expect(() => decryptPan(`${iv}:${enc}:00${tag.slice(2)}`)).toThrow();
    expect(() => decryptPan('not-a-payload')).toThrow();
  });

  it('hashPan is deterministic and HMAC-bound (differs from plain SHA-256)', async () => {
    const { createHash } = await import('node:crypto');
    const { hashPan } = await import('./pan-crypto');
    const pan = '5927435382278304';
    expect(hashPan(pan)).toBe(hashPan(pan));
    expect(hashPan(pan)).not.toBe(createHash('sha256').update(pan).digest('hex'));
    expect(hashPan(pan)).toHaveLength(64);
  });

  it('formatPan groups by 4', async () => {
    const { formatPan } = await import('./pan-crypto');
    expect(formatPan('5927435382278304')).toBe('5927 4353 8227 8304');
  });
});
