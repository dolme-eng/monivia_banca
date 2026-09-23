import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing the module.
// Implementation uses an interactive transaction with raw SQL.
const mockQueryRawUnsafe = vi.fn();
const mockExecuteRawUnsafe = vi.fn();
const mockTx = {
  $queryRawUnsafe: mockQueryRawUnsafe,
  $executeRawUnsafe: mockExecuteRawUnsafe,
};
const mockTransaction = vi.fn(async (fn: any) => fn(mockTx));

vi.mock('./prisma', () => ({
  prisma: {
    $transaction: (...args: any[]) => mockTransaction(...args),
  },
}));

const { checkRateLimit, getClientIp, rateLimitedResponse } = await import('./rate-limit');

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows first request when no existing entry', async () => {
    mockQueryRawUnsafe.mockResolvedValue([]);
    mockExecuteRawUnsafe.mockResolvedValue(1);

    const result = await checkRateLimit('key-1', 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    // INSERT must include a generated id (NOT NULL column)
    expect(mockExecuteRawUnsafe.mock.calls[0][0]).toMatch(/INSERT INTO "RateLimitEntry" \(id, key, count/);
  });

  it('allows request when window has expired', async () => {
    mockQueryRawUnsafe.mockResolvedValue([{ count: 3, resetAt: new Date(Date.now() - 1000) }]);

    const result = await checkRateLimit('key-2', 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('increments count for existing entry within window', async () => {
    mockQueryRawUnsafe.mockResolvedValue([{ count: 2, resetAt: new Date(Date.now() + 60000) }]);

    const result = await checkRateLimit('key-3', 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(mockExecuteRawUnsafe).toHaveBeenCalled();
  });

  it('blocks when limit exceeded', async () => {
    mockQueryRawUnsafe.mockResolvedValue([{ count: 5, resetAt: new Date(Date.now() + 60000) }]);

    const result = await checkRateLimit('key-4', 5, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('returns correct resetAt timestamp', async () => {
    mockQueryRawUnsafe.mockResolvedValue([]);

    const now = Date.now();
    const result = await checkRateLimit('key-5', 5, 10000);
    expect(result.resetAt).toBeGreaterThanOrEqual(now + 10000 - 1000);
    expect(result.resetAt).toBeLessThanOrEqual(now + 10000 + 1000);
  });

  it('DENIES on database error by default (fail-closed)', async () => {
    mockTransaction.mockRejectedValueOnce(new Error('DB connection failed'));

    const result = await checkRateLimit('key-6', 5, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('allows on database error only with explicit fail-open opt-in', async () => {
    mockTransaction.mockRejectedValueOnce(new Error('DB connection failed'));

    const result = await checkRateLimit('key-7', 5, 60000, { failClosed: false });
    expect(result.allowed).toBe(true);
  });

  it('locks the row with SELECT ... FOR UPDATE', async () => {
    mockQueryRawUnsafe.mockResolvedValue([]);

    await checkRateLimit('key-8', 5, 60000);
    expect(mockQueryRawUnsafe.mock.calls[0][0]).toMatch(/FOR UPDATE/);
  });
});

describe('rateLimitedResponse', () => {
  it('returns 429 with Retry-After header', () => {
    const res = rateLimitedResponse({ allowed: false, remaining: 0, resetAt: Date.now() + 30000 });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });
});

describe('getClientIp', () => {
  it('prefers x-real-ip over x-forwarded-for (edge-controlled)', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('9.9.9.9');
  });

  it('prefers cf-connecting-ip', () => {
    const req = new Request('http://localhost', {
      headers: { 'cf-connecting-ip': '7.7.7.7', 'x-forwarded-for': '1.2.3.4' },
    });
    expect(getClientIp(req)).toBe('7.7.7.7');
  });

  it('takes the rightmost XFF entry (edge-appended, not attacker-controlled leftmost)', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('5.6.7.8');
  });

  it('trims whitespace from x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '  10.0.0.1  , 192.168.1.1  ' },
    });
    expect(getClientIp(req)).toBe('192.168.1.1');
  });

  it('returns unknown when no IP headers', () => {
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
