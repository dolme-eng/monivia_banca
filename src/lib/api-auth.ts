import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.CSRF_SECRET || '';

export interface SessionPayload {
  role?: string;
  userId?: string;
  email?: string;
}

export async function verifySession(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get('authjs.session-token')?.value
    || req.cookies.get('__Secure-authjs.session-token')?.value;
  if (!token || !AUTH_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(AUTH_SECRET));
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireAuth(
  req: NextRequest
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const session = await verifySession(req);
  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Non autenticato' },
        { status: 401 }
      ),
    };
  }
  return { session };
}

export async function requireAdmin(
  req: NextRequest
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const result = await requireAuth(req);
  if ('error' in result) return result;
  if (result.session.role !== 'ADMIN') {
    return {
      error: NextResponse.json(
        { success: false, error: 'Accesso riservato all\'amministrazione' },
        { status: 403 }
      ),
    };
  }
  return result;
}
