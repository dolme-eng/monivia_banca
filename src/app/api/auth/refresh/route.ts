import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'node:crypto';

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!AUTH_SECRET) {
  console.error('[SECURITY] AUTH_SECRET non configurato — refresh impossibile');
}
const secret = AUTH_SECRET ? new TextEncoder().encode(AUTH_SECRET) : null;

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 30;

export async function POST(req: NextRequest) {
  if (!secret) {
    return NextResponse.json({ error: 'Configurazione di sicurezza mancante' }, { status: 500 });
  }

  const refreshTokenValue = req.cookies.get('refresh-token')?.value;
  if (!refreshTokenValue) {
    return NextResponse.json({ error: 'Refresh token mancante' }, { status: 401 });
  }

  try {
    // Clean up expired refresh tokens (best-effort, non-blocking)
    prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});

    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
      include: { user: true },
    });

    if (!dbToken) {
      return NextResponse.json({ error: 'Refresh token non valido' }, { status: 401 });
    }

    if (new Date() > dbToken.expiresAt) {
      await prisma.refreshToken.delete({ where: { id: dbToken.id } });
      return NextResponse.json({ error: 'Refresh token scaduto' }, { status: 401 });
    }

    const user = dbToken.user;

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

    const newRefreshToken = randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: dbToken.id } }),
      prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: user.id,
          expiresAt,
        },
      }),
    ]);

    const response = NextResponse.json({ ok: true, role: user.role });

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
      maxAge: 60 * 60 * 24 * REFRESH_TOKEN_TTL_DAYS,
    });

    return response;
  } catch (err) {
    console.error('[REFRESH]', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
