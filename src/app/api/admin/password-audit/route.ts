import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { validateCsrfToken } from '@/lib/csrf';

/**
 * TEMPORARY, read-only. Lists accounts with NO usable password.
 *
 * Needed because /api/admin/accounts does not select `hashedPassword` (it must
 * not), so the admin UI cannot tell a locked-out client from a normal one — and
 * because provision() silently ignored the password for an existing User.
 *
 * Reports only the boolean "has a password". No hash is ever returned, logged
 * or transmitted.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  if (!checkOrigin(req)) {
    return NextResponse.json({ success: false, error: 'Accesso negato' }, { status: 403 });
  }

  if (!validateCsrfToken(req.headers.get('x-csrf-token'))) {
    return NextResponse.json({ success: false, error: 'Token CSRF non valido' }, { status: 403 });
  }

  try {
    // Selected server-side so the value never leaves the database.
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nome: true,
        cognome: true,
        role: true,
        hashedPassword: true,
        lockedUntil: true,
        failedAttempts: true,
        accounts: {
          select: { id: true, iban: true, status: true, balance: true },
        },
      },
      orderBy: { email: 'asc' },
    });

    const rows = users.map((u) => ({
      email: u.email,
      name: `${u.nome} ${u.cognome}`,
      role: u.role,
      hasPassword: Boolean(u.hashedPassword),
      locked: Boolean(u.lockedUntil && u.lockedUntil > new Date()),
      failedAttempts: u.failedAttempts,
      accounts: u.accounts.map((a) => ({
        iban: a.iban,
        status: a.status,
        balance: Number(a.balance),
      })),
    }));

    const withoutPassword = rows.filter((r) => !r.hasPassword && r.role !== 'ADMIN');

    return NextResponse.json({
      success: true,
      totalUsers: rows.length,
      withoutPasswordCount: withoutPassword.length,
      withoutPassword,
      all: rows,
    });
  } catch (error) {
    console.error('[password-audit]', error);
    return NextResponse.json({ success: false, error: 'Audit failed' }, { status: 500 });
  }
}
