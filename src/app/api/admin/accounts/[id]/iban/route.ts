import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';
import { isValidIban, normalizeIban } from '@/lib/iban';
import { logAudit } from '@/lib/audit';

const ibanUpdateSchema = z.object({
  iban: z.string().min(15).max(34).trim(),
});

/**
 * Admin-only IBAN correction. The new IBAN must pass ISO 13616 mod-97
 * validation and be unused. Old -> new is written to the audit trail.
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
  const rl = await checkRateLimit(`admin-iban:${auth.session.userId}:${ip}`, 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return rateLimitedResponse(rl);
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = ibanUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'IBAN non valido' }, { status: 400 });
    }
    const newIban = normalizeIban(parsed.data.iban);
    if (!isValidIban(newIban)) {
      return NextResponse.json({ success: false, error: 'IBAN non valido (controllo mod-97 fallito)' }, { status: 400 });
    }

    const account = await prisma.account.findUnique({
      where: { id },
      select: { id: true, iban: true },
    });
    if (!account) {
      return NextResponse.json({ success: false, error: 'Conto non trovato' }, { status: 404 });
    }
    if (account.iban === newIban) {
      return NextResponse.json({ success: false, error: 'IBAN invariato' }, { status: 400 });
    }

    const taken = await prisma.account.findUnique({
      where: { iban: newIban },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ success: false, error: 'IBAN già in uso' }, { status: 409 });
    }

    const updated = await prisma.account.update({
      where: { id },
      data: { iban: newIban },
      select: { id: true, iban: true },
    });

    await logAudit({
      actorId: auth.session.userId!,
      action: 'IBAN_CHANGE',
      entity: 'Account',
      entityId: id,
      before: account.iban,
      after: newIban,
    });

    return NextResponse.json({ success: true, account: updated });
  } catch {
    console.error('Admin IBAN update error');
    return NextResponse.json({ success: false, error: 'Errore interno' }, { status: 500 });
  }
}
