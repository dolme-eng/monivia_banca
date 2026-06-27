import { NextResponse } from 'next/server';

export async function POST() {
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

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  return response;
}
