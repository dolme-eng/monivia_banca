import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashToken, newToken } from '@/lib/tokens';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';
import { validateCsrfToken } from '@/lib/csrf';

const loginSchema = z.object({
  email: z.string().email('Email non valida').max(254).trim().toLowerCase(),
  password: z.string().min(1, 'Password richiesta').max(128),
});

const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  console.error('[SECURITY] AUTH_SECRET non configurato — login impossibile');
}
const secret = AUTH_SECRET ? new TextEncoder().encode(AUTH_SECRET) : null;

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 7;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
  if (!secret) {
    return NextResponse.json({ success: false, error: 'Configurazione di sicurezza mancante' }, { status: 500 });
  }
  try {
    const csrfToken = req.headers.get('x-csrf-token');
    if (!validateCsrfToken(csrfToken)) {
      return NextResponse.json({ success: false, error: 'Token CSRF non valido' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Dati non validi' }, { status: 400 });
    }
    const { email, password } = parsed.data;

    // Keyed by email + IP so X-Forwarded-For spoofing alone cannot bypass throttling
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`login:${email}:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return rateLimitedResponse(rl, 'Troppi tentativi. Riprova tra 15 minuti.');
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.hashedPassword) {
      // Validly-formatted dummy hash (cost 10) so a missing user costs ~same time
      // as a real bcrypt comparison; never throws on malformed salt.
      try {
        await bcrypt.compare(
          'dummy_password_never_matches_7f3a',
          '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdLPAZq'
        );
      } catch {
        /* ignore — timing mitigation only */
      }
      return NextResponse.json({ success: false, error: 'Credenziali non valide' }, { status: 401 });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json({
        success: false,
        error: `Account temporaneamente bloccato. Riprova tra ${remaining} minuti.`,
      }, { status: 429 });
    }

    const valid = await bcrypt.compare(password, user.hashedPassword);
    if (!valid) {
      const newAttempts = user.failedAttempts + 1;
      const lockUntil = newAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_DURATION_MS)
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: newAttempts,
          lockedUntil: lockUntil,
        },
      });

      if (lockUntil) {
        return NextResponse.json({
          success: false,
          error: `Troppi tentativi falliti. Account bloccato per 15 minuti.`,
        }, { status: 429 });
      }

      return NextResponse.json({ success: false, error: 'Credenziali non valide' }, { status: 401 });
    }

    if (user.failedAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });
    }

    const account = await prisma.account.findFirst({
      where: { userId: user.id },
      select: { status: true },
    });

    if (account && account.status !== 'ACTIVE') {
      const msg = account.status === 'PENDING'
        ? 'Il conto è in attesa di validazione. Riprova più tardi.'
        : account.status === 'FROZEN'
        ? 'Il conto è stato congelato. Contatta il supporto.'
        : 'Il conto non è attivo. Contatta il supporto.';
      return NextResponse.json({ success: false, error: msg }, { status: 403 });
    }

    const accessToken = await new SignJWT({
      name: `${user.nome} ${user.cognome}`,
      email: user.email,
      role: user.role,
      userId: user.id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_TTL)
      .sign(secret);

    let refreshTokenValue: string | null = null;
    try {
      refreshTokenValue = newToken(40);
      const refreshExpiresAt = new Date();
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

      // Store only the hash — the raw value goes to the httpOnly cookie once
      await prisma.refreshToken.create({
        data: {
          token: hashToken(refreshTokenValue),
          userId: user.id,
          expiresAt: refreshExpiresAt,
        },
      });
    } catch (err) {
      console.error('[LOGIN] Refresh token creation failed');
      refreshTokenValue = null;
    }

    const response = NextResponse.json({ success: true, role: user.role });

    response.cookies.set('authjs.session-token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15,
    });

    if (refreshTokenValue) {
      response.cookies.set('refresh-token', refreshTokenValue, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * REFRESH_TOKEN_TTL_DAYS,
      });
    }

    return response;
  } catch (err) {
    console.error('[LOGIN]', err);
    return NextResponse.json({ success: false, error: 'Errore interno' }, { status: 500 });
  }
}
