import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'La password deve avere almeno 8 caratteri'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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
