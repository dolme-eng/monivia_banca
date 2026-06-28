import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing the module
const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock('./prisma', () => ({
  prisma: {
    $transaction: vi.fn((fns: any[]) => Promise.all(fns)),
    rateLimitEntry: {
      findUnique: mockFindUnique,
      upsert: mockUpsert,
      update: mockUpdate,
    },
  },
}));

const { checkRateLimit, getClientIp } = await import('./rate-limit');

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows first request when no existing entry', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({});

    const result = await checkRateLimit('key-1', 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('allows request when window has expired', async () => {
    mockFindUnique.mockResolvedValue({ key: 'key-2', count: 3, resetAt: new Date(Date.now() - 1000) });
    mockUpsert.mockResolvedValue({});

    const result = await checkRateLimit('key-2', 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('increments count for existing entry within window', async () => {
    mockFindUnique.mockResolvedValue({ key: 'key-3', count: 2, resetAt: new Date(Date.now() + 60000) });
    mockUpdate.mockResolvedValue({});

    const result = await checkRateLimit('key-3', 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('blocks when limit exceeded', async () => {
    mockFindUnique.mockResolvedValue({ key: 'key-4', count: 5, resetAt: new Date(Date.now() + 60000) });

    const result = await checkRateLimit('key-4', 5, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('returns correct resetAt timestamp', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({});

    const now = Date.now();
    const result = await checkRateLimit('key-5', 5, 10000);
    expect(result.resetAt).toBeGreaterThanOrEqual(now + 10000 - 100);
    expect(result.resetAt).toBeLessThanOrEqual(now + 10000 + 100);
  });

  it('falls back to allowed on database error', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB connection failed'));

    const result = await checkRateLimit('key-6', 5, 60000);
    expect(result.allowed).toBe(true);
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
