import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock jose before importing the module under test
const mockJwtVerify = vi.fn();
vi.mock('jose', () => ({
  jwtVerify: (...args: any[]) => mockJwtVerify(...args),
}));

// Mock env vars before importing
process.env.AUTH_SECRET = 'test-api-auth-secret';

const { verifySession, requireAuth, requireAdmin } = await import('./api-auth');

function makeReq(cookieValue?: string): NextRequest {
  const headers = new Headers();
  if (cookieValue) {
    headers.set('cookie', `authjs.session-token=${cookieValue}`);
  }
  return new NextRequest('http://localhost/api/test', { headers });
}

describe('verifySession', () => {
  beforeEach(() => {
    mockJwtVerify.mockReset();
  });

  it('returns null when no cookie is present', async () => {
    const result = await verifySession(makeReq());
    expect(result).toBeNull();
  });

  it('returns null when AUTH_SECRET is not set', async () => {
    const original = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    const result = await verifySession(makeReq('valid-token'));
    expect(result).toBeNull();
    process.env.AUTH_SECRET = original;
  });

  it('returns session payload when token is valid', async () => {
    const payload = { role: 'USER', userId: 'user-123', email: 'test@test.it' };
    mockJwtVerify.mockResolvedValue({ payload });
    const result = await verifySession(makeReq('valid-token'));
    expect(result).toEqual(payload);
    expect(mockJwtVerify).toHaveBeenCalled();
  });

  it('returns null when jwtVerify throws (invalid token)', async () => {
    mockJwtVerify.mockRejectedValue(new Error('invalid signature'));
    const result = await verifySession(makeReq('bad-token'));
    expect(result).toBeNull();
  });

  it('checks both cookie names', async () => {
    const payload = { role: 'ADMIN' };
    mockJwtVerify.mockResolvedValue({ payload });
    const headers = new Headers();
    headers.set('cookie', '__Secure-authjs.session-token=secure-token');
    const req = new NextRequest('http://localhost/api/test', { headers });
    await verifySession(req);
    expect(mockJwtVerify).toHaveBeenCalled();
  });
});

describe('requireAuth', () => {
  beforeEach(() => {
    mockJwtVerify.mockReset();
  });

  it('returns session when authenticated', async () => {
    const payload = { role: 'USER', userId: 'u1' };
    mockJwtVerify.mockResolvedValue({ payload });
    const result = await requireAuth(makeReq('token'));
    expect('session' in result).toBe(true);
    if ('session' in result) {
      expect(result.session).toEqual(payload);
    }
  });

  it('returns error response when not authenticated', async () => {
    const result = await requireAuth(makeReq());
    expect('error' in result).toBe(true);
    if ('error' in result) {
      const response = result.error;
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Non autenticato');
    }
  });
});

describe('requireAdmin', () => {
  beforeEach(() => {
    mockJwtVerify.mockReset();
  });

  it('returns session when user is ADMIN', async () => {
    const payload = { role: 'ADMIN', userId: 'a1' };
    mockJwtVerify.mockResolvedValue({ payload });
    const result = await requireAdmin(makeReq('token'));
    expect('session' in result).toBe(true);
  });

  it('returns 403 when user is not ADMIN', async () => {
    const payload = { role: 'USER', userId: 'u1' };
    mockJwtVerify.mockResolvedValue({ payload });
    const result = await requireAdmin(makeReq('token'));
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(403);
    }
  });

  it('returns 401 when not authenticated', async () => {
    const result = await requireAdmin(makeReq());
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(401);
    }
  });
});
