import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/tokens';
import { validateCsrfToken } from '@/lib/csrf';
import { jwtVerify } from 'jose';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';

const AUTH_SECRET = process.env.AUTH_SECRET;
const secret = AUTH_SECRET ? new TextEncoder().encode(AUTH_SECRET) : null;

export async function POST(req: Request) {
  const csrfToken = req.headers.get('x-csrf-token');
  if (!validateCsrfToken(csrfToken)) {
    return NextResponse.json({ success: false, error: 'Token CSRF non valido' }, { status: 403 });
  }

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`logout:${ip}`, 30, 15 * 60 * 1000);
  if (!rl.allowed) {
    return rateLimitedResponse(rl);
  }

  const cookieHeader = req.headers.get('cookie') ?? '';
  const accessToken = cookieHeader.match(/(?:__Secure-)?authjs\.session-token=([^;]+)/)?.[1];
  const refreshCookie = cookieHeader.match(/(?:^|;\s*)refresh-token=([^;]+)/)?.[1];

  if (accessToken && secret) {
    try {
      const { payload } = await jwtVerify(accessToken, secret);
      const userId = payload.userId as string | undefined;
      if (userId) {
        await prisma.refreshToken.deleteMany({ where: { userId } }).catch(() => {});
      }
    } catch {
      // Token invalid/expired — fall through to refresh-cookie revocation below
    }
  }

  // Fallback: access token expired/invalid — revoke the presented refresh token directly
  // so a stolen refresh token does not survive logout.
  if (refreshCookie) {
    await prisma.refreshToken.deleteMany({ where: { token: hashToken(refreshCookie) } }).catch(() => {});
  }

  const response = NextResponse.json({ success: true });

  const cookieAttrs = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };

  response.cookies.set('authjs.session-token', '', cookieAttrs);
  response.cookies.set('__Secure-authjs.session-token', '', cookieAttrs);
  response.cookies.set('refresh-token', '', cookieAttrs);

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  return response;
}
