import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';
import { decryptPan, formatPan } from '@/lib/pan-crypto';
import { logAudit } from '@/lib/audit';

const panRevealSchema = z.object({
  cardId: z.string().uuid('ID carta non valido'),
});

/**
 * Reveal the full card PAN to its owner. Every reveal is audit-logged.
 * Cards issued before encrypted storage return 404 (only last4 exists).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
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
  const rl = await checkRateLimit(`user-pan:${auth.session.userId}:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return rateLimitedResponse(rl);
  }

  try {
    const body = await req.json();
    const parsed = panRevealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Dati non validi' }, { status: 400 });
    }

    // Ownership enforced via the account relation — generic 404 otherwise
    const card = await prisma.card.findFirst({
      where: { id: parsed.data.cardId, account: { userId: auth.session.userId } },
      select: { id: true, last4: true, panEnc: true, expiry: true },
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
      action: 'PAN_REVEAL_SELF',
      entity: 'Card',
      entityId: card.id,
      after: `last4:${card.last4}`,
    });

    return NextResponse.json({
      success: true,
      pan: formatPan(pan),
      expiry: card.expiry,
    });
  } catch {
    console.error('User PAN reveal error');
    return NextResponse.json({ success: false, error: 'Errore interno' }, { status: 500 });
  }
}
