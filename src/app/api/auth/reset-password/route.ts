import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateCsrfToken } from '@/lib/csrf';

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string()
    .min(8, 'La password deve avere almeno 8 caratteri')
    .regex(/[A-Z]/, 'La password deve contenere almeno una lettera maiuscola')
    .regex(/[a-z]/, 'La password deve contenere almeno una lettera minuscola')
    .regex(/[0-9]/, 'La password deve contenere almeno un numero')
    .regex(/[^A-Za-z0-9]/, 'La password deve contenere almeno un carattere speciale'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const csrfToken = req.headers.get('x-csrf-token');
    if (!validateCsrfToken(csrfToken)) {
      return NextResponse.json({ success: false, error: 'Token CSRF non valido' }, { status: 403 });
    }

    const { token, password } = resetPasswordSchema.parse(body);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!resetToken) {
      return NextResponse.json({ success: false, error: 'Link non valido' }, { status: 404 });
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json({ success: false, error: 'Link scaduto. Richiedi un nuovo link.' }, { status: 410 });
    }

    if (resetToken.usedAt) {
      return NextResponse.json({ success: false, error: 'Link già utilizzato. Richiedi un nuovo link.' }, { status: 410 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { hashedPassword, failedAttempts: 0, lockedUntil: null },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Password aggiornata con successo. Ora puoi accedere.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ success: false, error: 'Errore interno' }, { status: 500 });
  }
}
