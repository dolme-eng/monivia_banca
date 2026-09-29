import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

// Same policy as the client-facing change-password flow
const passwordSchema = z.object({
  password: z.string()
    .min(8, 'La password deve avere almeno 8 caratteri')
    .max(128, 'La password non può superare 128 caratteri')
    .regex(/[A-Z]/, 'Serve almeno una lettera maiuscola')
    .regex(/[a-z]/, 'Serve almeno una lettera minuscola')
    .regex(/[0-9]/, 'Serve almeno un numero')
    .regex(/[^A-Za-z0-9]/, 'Serve almeno un carattere speciale'),
});

/**
 * Admin-initiated password reset for a client.
 *
 * Exists because the self-service "password dimenticata" flow depends on email
 * delivery: when SMTP is misconfigured the client has no recovery path at all,
 * and provisioning silently ignores the password field for accounts that
 * already exist. Both make this the only way out.
 *
 * The new password is never returned, stored in a log, or emailed.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  if (!checkOrigin(req)) {
    return NextResponse.json({ success: false, error: 'Accesso negato' }, { status: 403 });
  }

  const ct = req.headers.get('content-type');
  if (!ct?.includes('application/json')) {
    return NextResponse.json({ success: false, error: 'Content-Type non valido' }, { status: 415 });
  }

  const csrfToken = req.headers.get('x-csrf-token');
  if (!validateCsrfToken(csrfToken)) {
    return NextResponse.json({ success: false, error: 'Token CSRF non valido' }, { status: 403 });
  }

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`admin-password:${auth.session.userId}:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return rateLimitedResponse(rl);
  }

  try {
    const { id } = await params;
    const parsed = passwordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Password non valida' },
        { status: 400 }
      );
    }

    const account = await prisma.account.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!account) {
      return NextResponse.json({ success: false, error: 'Conto non trovato' }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    // Reset the lockout and revoke every active session: a forced reset must
    // also terminate whoever was hammering the old password.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: account.userId },
        data: { hashedPassword, failedAttempts: 0, lockedUntil: null },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: account.userId } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: account.userId } }),
    ]);

    await logAudit({
      actorId: auth.session.userId!,
      action: 'USER_PASSWORD_RESET_BY_ADMIN',
      entity: 'User',
      entityId: account.userId,
      before: 'previous-password',
      after: 'admin-set',
    });

    return NextResponse.json({
      success: true,
      message: 'Password aggiornata. Le sessioni attive sono state chiuse.',
    });
  } catch {
    console.error('Admin password reset error');
    return NextResponse.json({ success: false, error: 'Errore interno' }, { status: 500 });
  }
}
