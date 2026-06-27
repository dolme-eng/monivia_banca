import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.CSRF_SECRET || '';

async function getSession(req: NextRequest) {
  const token = req.cookies.get('authjs.session-token')?.value
    || req.cookies.get('__Secure-authjs.session-token')?.value;
  if (!token || !AUTH_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(AUTH_SECRET));
    return payload as { role?: string; userId?: string };
  } catch {
    return null;
  }
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = pathname === '/'
    || pathname.startsWith('/api/csrf')
    || pathname.startsWith('/api/auth');
  const isAuthPage = pathname === '/login';

  if (isPublic || isAuthPage) {
    const session = await getSession(req);
    if (session && isAuthPage) {
      const redirectUrl = session.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard';
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }
    return NextResponse.next();
  }

  const session = await getSession(req);

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Non autenticato' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const isAdmin = session.role === 'ADMIN';

  if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/accounts/provision')) {
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Accesso riservato all\'amministrazione' },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin') && !isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (pathname.startsWith('/dashboard') && isAdmin) {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/login',
    '/api/admin/:path*',
    '/api/accounts/provision',
    '/api/transactions/:path*',
    '/api/prelievo/:path*',
    '/api/notifications/:path*',
    '/api/user/:path*',
  ],
};
