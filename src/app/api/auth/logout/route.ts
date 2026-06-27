import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set('authjs.session-token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set('__Secure-authjs.session-token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
