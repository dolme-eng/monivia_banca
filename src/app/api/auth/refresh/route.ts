import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { hashToken, newToken } from '@/lib/tokens';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';
import { validateCsrfToken } from '@/lib/csrf';

const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  console.error('[SECURITY] AUTH_SECRET non configurato — refresh impossibile');
}
const secret = AUTH_SECRET ? new TextEncoder().encode(AUTH_SECRET) : null;

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 7;
// Absolute session lifetime: refresh chains cannot live longer than this,
// even with continuous activity (sliding 7d rotation would otherwise be infinite).
const REFRESH_ABSOLUTE_TTL_DAYS = 30;
const MAX_ACTIVE_SESSIONS = 5;
// Consumed rows older than this are hygiene noise, not part of a live chain.
const SESSION_HYGIENE_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  if (!secret) {
    return NextResponse.json({ success: false, error: 'Configurazione di sicurezza mancante' }, { status: 500 });
  }

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`refresh:${ip}`, 20, 15 * 60 * 1000);
  if (!rl.allowed) {
    return rateLimitedResponse(rl);
  }

  const csrfToken = req.headers.get('x-csrf-token');
  if (!validateCsrfToken(csrfToken)) {
    return NextResponse.json({ success: false, error: 'Token CSRF non valido' }, { status: 403 });
  }

  const refreshTokenValue = req.cookies.get('refresh-token')?.value;
  if (!refreshTokenValue) {
    return NextResponse.json({ success: false, error: 'Refresh token mancante' }, { status: 401 });
  }

  try {
    // Clean up expired refresh tokens (best-effort, non-blocking)
    prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});

    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: hashToken(refreshTokenValue) },
      include: { user: true },
    });

    if (!dbToken) {
      return NextResponse.json({ success: false, error: 'Refresh token non valido' }, { status: 401 });
    }

    if (new Date() > dbToken.expiresAt) {
      await prisma.refreshToken.delete({ where: { id: dbToken.id } });
      return NextResponse.json({ success: false, error: 'Refresh token scaduto' }, { status: 401 });
    }

    // REUSE DETECTION: if token was already consumed, it's stolen — revoke ALL user tokens
    if (dbToken.consumedAt) {
      console.error(`[SECURITY] Refresh token reuse detected for user ${dbToken.userId}, token ${dbToken.id}`);
      await prisma.refreshToken.deleteMany({ where: { userId: dbToken.userId } });
      return NextResponse.json({ success: false, error: 'Token non valido' }, { status: 401 });
    }

    const user = dbToken.user;

    // Absolute lifetime: a refresh chain older than 30 days forces re-login,
    // even with continuous activity.
    if (Date.now() - new Date(dbToken.createdAt).getTime() > REFRESH_ABSOLUTE_TTL_DAYS * 24 * 60 * 60 * 1000) {
      await prisma.refreshToken.delete({ where: { id: dbToken.id } }).catch(() => {});
      return NextResponse.json({ success: false, error: 'Sessione scaduta. Effettua nuovamente il login.' }, { status: 401 });
    }

    // Re-check lockout and account status: a FROZEN/CLOSED/locked account
    // must not keep minting access tokens through refresh.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await prisma.refreshToken.delete({ where: { id: dbToken.id } }).catch(() => {});
      return NextResponse.json({ success: false, error: 'Account bloccato' }, { status: 401 });
    }

    // A deleted account yields `null`, which used to SKIP this guard entirely
    // and mint a fresh session for an account that no longer exists. Absence
    // must be treated exactly like a non-ACTIVE account.
    const account = await prisma.account.findFirst({
      where: { userId: user.id },
      select: { status: true },
    });
    if (!account || account.status !== 'ACTIVE') {
      await prisma.refreshToken.delete({ where: { id: dbToken.id } }).catch(() => {});
      return NextResponse.json({ success: false, error: 'Conto non attivo' }, { status: 403 });
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

    // The new token inherits the ORIGINAL session start instead of starting a
    // fresh window. The absolute check above reads `createdAt`, and since
    // rotation used to write a brand new row every time, `createdAt` was always
    // "now" — so the 30-day limit was measured from the latest refresh and never
    // actually elapsed. The session could be renewed forever, one 7-day token
    // at a time. Anchoring to the oldest row in the chain restores the intended
    // meaning: no matter how often you refresh, you log in again every 30 days.
    const chainStart = await prisma.refreshToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { lte: dbToken.createdAt },
        // `consumedAt` is a DateTime, so the cut-off must be a Date: comparing it
        // to a number of milliseconds is a type error.
        OR: [{ consumedAt: null }, { consumedAt: { gte: new Date(Date.now() - SESSION_HYGIENE_MS) } }],
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    const sessionStartedAt = chainStart?.createdAt ?? dbToken.createdAt;

    const remainingMs =
      sessionStartedAt.getTime() + REFRESH_ABSOLUTE_TTL_DAYS * 24 * 60 * 60 * 1000 - Date.now();
    if (remainingMs <= 0) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      return NextResponse.json({ success: false, error: 'Sessione scaduta. Effettua nuovamente il login.' }, { status: 401 });
    }

    // Never mint a refresh token that outlives the absolute session deadline:
    // the cookie and the DB row must agree, or a token could outlive its window.
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const hardExpiresAt = new Date(sessionStartedAt.getTime() + REFRESH_ABSOLUTE_TTL_DAYS * 24 * 60 * 60 * 1000);
    const expiresAt = newExpiresAt < hardExpiresAt ? newExpiresAt : hardExpiresAt;

    const newRefreshToken = newToken(40);

    // Atomic single-use claim: concurrent replays race here and exactly one wins.
    // The loser gets count 0 -> plain 401 (mass revocation already happened above
    // only when reuse was positively observed).
    const claim = await prisma.refreshToken.updateMany({
      where: { id: dbToken.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (claim.count !== 1) {
      return NextResponse.json({ success: false, error: 'Token non valido' }, { status: 401 });
    }

    const created = await prisma.refreshToken.create({
      data: {
        token: hashToken(newRefreshToken),
        userId: user.id,
        expiresAt,
        // Explicitly backdated to the session start so the absolute check works
        // on every row of the chain, not just on the row that happens to be
        // presented. Without this, `createdAt` is "now" for each rotation.
        createdAt: sessionStartedAt,
      },
    });

    // Hygiene, best-effort: drop long-consumed tokens and cap concurrent sessions
    try {
      const dayAgo = new Date(Date.now() - SESSION_HYGIENE_MS);
      await prisma.refreshToken.deleteMany({
        where: { userId: user.id, consumedAt: { lt: dayAgo } },
      });
      const active = await prisma.refreshToken.findMany({
        where: { userId: user.id, consumedAt: null, id: { not: created.id } },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (active.length >= MAX_ACTIVE_SESSIONS) {
        await prisma.refreshToken.deleteMany({
          where: { id: { in: active.slice(MAX_ACTIVE_SESSIONS - 1).map((t) => t.id) } },
        });
      }
    } catch {
      /* hygiene must never break refresh */
    }

    const response = NextResponse.json({ success: true, role: user.role });

    response.cookies.set('authjs.session-token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15,
    });

    response.cookies.set('refresh-token', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      // Matches the clamped DB expiry, so the cookie cannot outlive the server
      // side token it points at.
      maxAge: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
    });

    return response;
  } catch (err) {
    console.error('[REFRESH]', err);
    return NextResponse.json({ success: false, error: 'Errore interno' }, { status: 500 });
  }
}
