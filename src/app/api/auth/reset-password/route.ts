import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/tokens';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';

const resetPasswordSchema = z.object({
  token: z.string().min(1).max(256).trim(),
  password: z.string()
    .min(8, 'La password deve avere almeno 8 caratteri')
    .max(128, 'La password non può superare 128 caratteri')
    .regex(/[A-Z]/, 'La password deve contenere almeno una lettera maiuscola')
    .regex(/[a-z]/, 'La password deve contenere almeno una lettera minuscola')
    .regex(/[0-9]/, 'La password deve contenere almeno un numero')
    .regex(/[^A-Za-z0-9]/, 'La password deve contenere almeno un carattere speciale'),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) {
    return rateLimitedResponse(rl);
  }

  try {
    const body = await req.json();

    const csrfToken = req.headers.get('x-csrf-token');
    if (!validateCsrfToken(csrfToken)) {
      return NextResponse.json({ success: false, error: 'Token CSRF non valido' }, { status: 403 });
    }

    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
    }
    const { token, password } = parsed.data;

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashToken(token) },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!resetToken) {
      return NextResponse.json({ success: false, error: 'Link non valido o scaduto' }, { status: 400 });
    }

    if (new Date() > resetToken.expiresAt || resetToken.usedAt) {
      return NextResponse.json({ success: false, error: 'Link non valido o scaduto' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Atomic single-use claim: concurrent replays of the same token all fail except one
    const claim = await prisma.passwordResetToken.updateMany({
      where: { id: resetToken.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claim.count !== 1) {
      return NextResponse.json({ success: false, error: 'Link non valido o scaduto' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { hashedPassword, failedAttempts: 0, lockedUntil: null },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Password aggiornata con successo. Ora puoi accedere.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ success: false, error: 'Errore interno' }, { status: 500 });
  }
}
