import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'node:crypto';
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

// Dummy hash for the "user not found" branch, computed once per instance.
// Generated rather than hardcoded: a hand-written bcrypt string can be invalid
// (compare then throws or short-circuits) which silently defeats the whole
// timing equalisation. Cost MUST match the real hashes (12) or the difference
// itself leaks account existence.
let dummyHash: string | null = null;
function getDummyHash(): string {
  if (!dummyHash) {
    dummyHash = bcrypt.hashSync(randomBytes(16).toString('hex'), 12);
  }
  return dummyHash;
}

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
      // Same-cost compare against a generated dummy hash so a missing user
      // takes as long as a real (wrong) password attempt.
      try {
        await bcrypt.compare('dummy_password_never_matches', getDummyHash());
      } catch {
        /* ignore — timing mitigation only */
      }
      return NextResponse.json({ success: false, error: 'Credenziali non valide' }, { status: 401 });
    }

    // Password is verified BEFORE any account-state message is returned.
    // Revealing "locked" / "not active" only after a correct password carries
    // no enumeration risk (the caller already proved knowledge of the secret),
    // while hiding it entirely locks real users out with no explanation.
    const valid = await bcrypt.compare(password, user.hashedPassword);

    if (!valid) {
      // Atomic increment: a plain read-modify-write loses updates under
      // concurrency (N parallel wrong passwords all read the same value and
      // write the same one, so the lockout would never trigger).
      const bumped = await prisma.user.updateMany({
        where: { id: user.id, failedAttempts: { lt: MAX_FAILED_ATTEMPTS } },
        data: { failedAttempts: { increment: 1 } },
      });
      if (bumped.count === 0) {
        // Already at/over the threshold: re-arm the lock without ever writing a
        // lower counter.
        await prisma.user.updateMany({
          where: { id: user.id },
          data: { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) },
        });
        return NextResponse.json({
          success: false,
          error: 'Troppi tentativi falliti. Account bloccato per 15 minuti.',
        }, { status: 429 });
      }

      // Constant response for every wrong-password case. A per-attempt counter
      // in the message ("N tentativi rimasti") confirmed account existence to
      // anyone probing addresses, defeating the constant-time compare above.
      return NextResponse.json({ success: false, error: 'Credenziali non valide' }, { status: 401 });
    }

    // Correct password: now safe to explain the account state
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json({
        success: false,
        error: `Password corretta, ma l'account è bloccato per troppi tentativi falliti. Riprova tra ${remaining} minuti.`,
      }, { status: 429 });
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

    // Password is proven correct at this point, so the account state can be
    // reported precisely — no enumeration oracle (an attacker without the
    // password never reaches this branch).
    if (account && account.status !== 'ACTIVE') {
      const msg = account.status === 'PENDING'
        ? 'Il tuo conto è in attesa di validazione. Ti avviseremo via email appena attivo.'
        : account.status === 'FROZEN'
          ? 'Il tuo conto è congelato. Contatta il supporto per maggiori informazioni.'
          : 'Il tuo conto è chiuso. Contatta il supporto.';
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
