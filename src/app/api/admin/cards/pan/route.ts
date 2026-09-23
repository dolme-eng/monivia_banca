import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';
import { decryptPan, formatPan } from '@/lib/pan-crypto';
import { logAudit } from '@/lib/audit';

const panRevealSchema = z.object({
  cardId: z.string().uuid('ID carta non valido'),
});

/**
 * Reveal the full card PAN to an admin. Every reveal is audit-logged.
 * Cards issued before encrypted storage return 404 (only last4 exists).
 */
export async function POST(req: NextRequest) {
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
  const rl = await checkRateLimit(`admin-pan:${auth.session.userId}:${ip}`, 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return rateLimitedResponse(rl);
  }

  try {
    const body = await req.json();
    const parsed = panRevealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Dati non validi' }, { status: 400 });
    }

    const card = await prisma.card.findUnique({
      where: { id: parsed.data.cardId },
      select: { id: true, last4: true, panEnc: true, expiry: true, holder: true },
    });
    if (!card) {
      return NextResponse.json({ success: false, error: 'Carta non trovata' }, { status: 404 });
    }
    if (!card.panEnc) {
      return NextResponse.json(
        { success: false, error: 'Numero completo non disponibile per questa carta' },
        { status: 404 }
      );
    }

    let pan: string;
    try {
      pan = decryptPan(card.panEnc);
    } catch {
      console.error('PAN decrypt failed');
      return NextResponse.json({ success: false, error: 'Errore interno' }, { status: 500 });
    }

    await logAudit({
      actorId: auth.session.userId!,
      action: 'PAN_REVEAL',
      entity: 'Card',
      entityId: card.id,
      after: `last4:${card.last4}`,
    });

    return NextResponse.json({
      success: true,
      pan: formatPan(pan),
      last4: card.last4,
      expiry: card.expiry,
      holder: card.holder,
    });
  } catch {
    console.error('Admin PAN reveal error');
    return NextResponse.json({ success: false, error: 'Errore interno' }, { status: 500 });
  }
}
