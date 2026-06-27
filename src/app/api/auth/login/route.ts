import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!AUTH_SECRET) {
  console.error('[SECURITY] AUTH_SECRET non configurato — login impossibile');
}
const secret = AUTH_SECRET ? new TextEncoder().encode(AUTH_SECRET) : null;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function isLoginRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  record.count++;
  return record.count > 5;
}

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(req: NextRequest) {
  if (!secret) {
    return NextResponse.json({ error: 'Configurazione di sicurezza mancante' }, { status: 500 });
  }
  try {
    const ip = getClientIp(req);
    if (isLoginRateLimited(ip)) {
      return NextResponse.json({ error: 'Troppi tentativi. Riprova tra 15 minuti.' }, { status: 429 });
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Credenziali mancanti' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.hashedPassword) {
      await bcrypt.compare('dummy_hash_to_prevent_timing_attack', '$2a$12$x' + '0'.repeat(53));
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.hashedPassword);
    if (!valid) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 });
    }

    loginAttempts.delete(ip);

    const token = await new SignJWT({
      name: `${user.nome} ${user.cognome}`,
      email: user.email,
      role: user.role,
      userId: user.id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret);

    const response = NextResponse.json({ ok: true, role: user.role });

    response.cookies.set('authjs.session-token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err) {
    console.error('[LOGIN]', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
