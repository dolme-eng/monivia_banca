import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateCsrfToken, validateCsrfToken } from './csrf';

describe('CSRF Token', () => {
  beforeEach(() => {
    process.env.CSRF_SECRET = 'test-secret-key-for-csrf';
  });

  afterEach(() => {
    delete process.env.CSRF_SECRET;
  });

  it('generates a token with correct format', () => {
    const token = generateCsrfToken();
    expect(token).toBeTruthy();
    expect(token.split('.')).toHaveLength(2);
    expect(token.split('.')[0]).toMatch(/^\d+:[a-f0-9]+$/);
  });

  it('validates a freshly generated token', () => {
    const token = generateCsrfToken();
    expect(validateCsrfToken(token)).toBe(true);
  });

  it('rejects null token', () => {
    expect(validateCsrfToken(null)).toBe(false);
  });

  it('rejects undefined token', () => {
    expect(validateCsrfToken(undefined)).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateCsrfToken('')).toBe(false);
  });

  it('rejects token without dot separator', () => {
    expect(validateCsrfToken('nodot')).toBe(false);
  });

  it('rejects token with invalid signature', () => {
    const token = generateCsrfToken();
    const parts = token.split('.');
    const tampered = `${parts[0]}.0000${parts[1].slice(4)}`;
    expect(validateCsrfToken(tampered)).toBe(false);
  });

  it('rejects expired token (timestamp > 1 hour ago)', () => {
    const secret = process.env.CSRF_SECRET!;
    const { createHmac, randomBytes } = require('crypto');
    const oldTimestamp = Date.now() - 60 * 60 * 1000 - 1;
    const payload = `${oldTimestamp}:${randomBytes(16).toString('hex')}`;
    const sig = createHmac('sha256', secret).update(payload).digest('hex');
    const expiredToken = `${payload}.${sig}`;
    expect(validateCsrfToken(expiredToken)).toBe(false);
  });

  it('accepts token with valid signature but different payload (signature is payload-bound)', () => {
    const secret = process.env.CSRF_SECRET!;
    const { createHmac, randomBytes } = require('crypto');
    const fakePayload = `${Date.now()}:${randomBytes(16).toString('hex')}`;
    const sig = createHmac('sha256', secret).update(fakePayload).digest('hex');
    expect(validateCsrfToken(`${fakePayload}.${sig}`)).toBe(true);
  });

  it('rejects token from different secret', () => {
    const token = generateCsrfToken();
    process.env.CSRF_SECRET = 'different-secret';
    expect(validateCsrfToken(token)).toBe(false);
  });

  it('generates unique tokens each time', () => {
    const t1 = generateCsrfToken();
    const t2 = generateCsrfToken();
    expect(t1).not.toBe(t2);
  });
});
