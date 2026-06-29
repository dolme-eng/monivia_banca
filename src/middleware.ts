import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.CSRF_SECRET;
if (!AUTH_SECRET) {
  console.error('[SECURITY] AUTH_SECRET non configurato — il middleware non potrà verificare i token');
}

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

function isTokenNearExpiry(req: NextRequest): boolean {
  const token = req.cookies.get('authjs.session-token')?.value;
  if (!token || !AUTH_SECRET) return false;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const exp = payload.exp * 1000;
    const now = Date.now();
    return exp - now < 5 * 60 * 1000;
  } catch {
    return false;
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

  let session = await getSession(req);

  if (!session && isTokenNearExpiry(req)) {
    const refreshToken = req.cookies.get('refresh-token')?.value;
    if (refreshToken) {
      try {
        const refreshUrl = new URL('/api/auth/refresh', req.url);
        const refreshResponse = await fetch(refreshUrl, {
          method: 'POST',
          headers: { cookie: `refresh-token=${refreshToken}` },
        });

        if (refreshResponse.ok) {
          const setCookies = refreshResponse.headers.getSetCookie?.() || [];
          session = await getSession(req);

          if (session && setCookies.length > 0) {
            const res = NextResponse.next();
            for (const cookie of setCookies) {
              res.headers.append('Set-Cookie', cookie);
            }
            return res;
          }
        }
      } catch {}
    }
  }

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
