import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email-notify';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email non valida'),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`forgot-password:${ip}`, 3, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste. Riprova più tardi.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, nome: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true, message: 'Se l\'email esiste, riceverai un link di ripristino.' });
    }

    // Clean old tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'https://banca.monivia.it';
    const resetUrl = `${origin}/reset-password/${token}`;

    try {
      await sendPasswordResetEmail({
        userName: user.nome,
        userEmail: user.email,
        resetUrl,
      });
    } catch (e) {
      console.error('Password reset email failed (non-blocking):', e);
    }

    return NextResponse.json({ success: true, message: 'Se l\'email esiste, riceverai un link di ripristino.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ success: false, error: 'Errore interno' }, { status: 500 });
  }
}
