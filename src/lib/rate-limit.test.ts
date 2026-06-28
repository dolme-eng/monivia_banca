import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, getClientIp } from './rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Rate limiter uses module-level Map; no way to clear it directly
    // Use unique keys per test to avoid interference
  });

  it('allows first request', () => {
    const result = checkRateLimit(`test-${Date.now()}-1`, 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it('tracks remaining requests correctly', () => {
    const key = `test-${Date.now()}-track`;
    const r1 = checkRateLimit(key, 3, 60000);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, 3, 60000);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, 3, 60000);
    expect(r3.remaining).toBe(0);
    expect(r3.allowed).toBe(true);
  });

  it('blocks when limit exceeded', () => {
    const key = `test-${Date.now()}-block`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, 3, 60000);
    }
    const blocked = checkRateLimit(key, 3, 60000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('resets after window expires', () => {
    const key = `test-${Date.now()}-reset`;
    const result = checkRateLimit(key, 2, 1); // 1ms window
    expect(result.allowed).toBe(true);

    // Wait for window to expire
    const start = Date.now();
    while (Date.now() - start < 5) { /* busy wait */ }

    const afterReset = checkRateLimit(key, 2, 1);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(1);
  });

  it('tracks different keys independently', () => {
    const base = Date.now();
    const r1 = checkRateLimit(`a-${base}`, 1, 60000);
    const r2 = checkRateLimit(`b-${base}`, 1, 60000);
    expect(r1.remaining).toBe(0);
    expect(r2.remaining).toBe(0);
  });

  it('returns correct resetAt timestamp', () => {
    const key = `test-${Date.now()}-ts`;
    const now = Date.now();
    const result = checkRateLimit(key, 5, 10000);
    expect(result.resetAt).toBeGreaterThanOrEqual(now + 10000 - 100);
    expect(result.resetAt).toBeLessThanOrEqual(now + 10000 + 100);
  });
});

describe('getClientIp', () => {
  it('extracts first IP from x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('trims whitespace from x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '  10.0.0.1  , 192.168.1.1' },
    });
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('returns unknown when no x-forwarded-for header', () => {
    const req = new Request('http://localhost');
    expect(getClientIp(req)).toBe('unknown');
  });

  it('handles single IP in x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '8.8.8.8' },
    });
    expect(getClientIp(req)).toBe('8.8.8.8');
  });
});
