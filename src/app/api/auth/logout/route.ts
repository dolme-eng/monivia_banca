import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const refreshToken = req.headers.get('cookie')?.match(/refresh-token=([^;]+)/)?.[1];

  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {});
  }

  const response = NextResponse.json({ ok: true });

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
