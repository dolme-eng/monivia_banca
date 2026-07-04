import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { validateCsrfToken } from '@/lib/csrf';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password attuale richiesta'),
  newPassword: z.string().min(8, 'La nuova password deve avere almeno 8 caratteri'),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const csrfToken = req.headers.get('x-csrf-token');
  if (!validateCsrfToken(csrfToken)) {
    return NextResponse.json({ success: false, error: 'Token CSRF non valido' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { id: true, hashedPassword: true },
    });

    if (!user || !user.hashedPassword) {
      return NextResponse.json({ success: false, error: 'Account non trovato' }, { status: 404 });
    }

    const valid = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Password attuale non valida' }, { status: 401 });
    }

    const hashedNew = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword: hashedNew },
    });

    return NextResponse.json({ success: true, message: 'Password aggiornata con successo' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ success: false, error: 'Errore interno' }, { status: 500 });
  }
}
