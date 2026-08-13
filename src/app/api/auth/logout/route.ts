import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCsrfToken } from '@/lib/csrf';

export async function POST(req: Request) {
  const csrfToken = req.headers.get('x-csrf-token');
  if (!validateCsrfToken(csrfToken)) {
    return NextResponse.json({ success: false, error: 'Token CSRF non valido' }, { status: 403 });
  }

  const refreshToken = req.headers.get('cookie')?.match(/(?:__Secure-)?refresh-token=([^;]+)/)?.[1];

  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {});
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
