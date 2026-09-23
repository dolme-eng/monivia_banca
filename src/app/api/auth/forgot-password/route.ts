import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashToken, newToken } from '@/lib/tokens';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email-notify';
import { validateCsrfToken } from '@/lib/csrf';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email non valida'),
});

export async function POST(req: NextRequest) {
  const csrfToken = req.headers.get('x-csrf-token');
  if (!validateCsrfToken(csrfToken)) {
    return NextResponse.json({ success: false, error: 'Token CSRF non valido' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Email non valida' }, { status: 400 });
    }
    const { email } = parsed.data;

    // Keyed by email + IP so header spoofing alone cannot bypass throttling
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`forgot-password:${email.toLowerCase()}:${ip}`, 3, 60 * 60 * 1000);
    if (!rl.allowed) {
      return rateLimitedResponse(rl, 'Troppe richieste. Riprova più tardi.');
    }

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

    const token = newToken(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store only the hash — the raw value goes into the emailed link once
    await prisma.passwordResetToken.create({
      data: {
        token: hashToken(token),
        userId: user.id,
        expiresAt,
      },
    });

    const allowedOrigins = ['https://banca.monivia.it', 'https://monivia.it', 'https://www.monivia.it'];
    const originHeader = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'https://banca.monivia.it';
    let validatedOrigin = originHeader;
    try {
      const originUrl = new URL(originHeader);
      if (!allowedOrigins.includes(originUrl.origin)) {
        validatedOrigin = 'https://banca.monivia.it';
      }
    } catch {
      validatedOrigin = 'https://banca.monivia.it';
    }
    const resetUrl = `${validatedOrigin}/reset-password/${token}`;

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
