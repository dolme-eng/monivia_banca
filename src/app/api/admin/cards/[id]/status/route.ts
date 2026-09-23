import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { validateCsrfToken } from '@/lib/csrf';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

const statusSchema = z.object({
  action: z.enum(['freeze', 'unfreeze', 'expire', 'reactivate', 'delete']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  if (!checkOrigin(req)) {
    return NextResponse.json({ success: false, error: 'Accesso negato' }, { status: 403 });
  }

  const csrfToken = req.headers.get('x-csrf-token');
  if (!validateCsrfToken(csrfToken)) {
    return NextResponse.json({ success: false, error: 'Token CSRF non valido' }, { status: 403 });
  }

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`admin-card-action:${auth.session.userId}:${ip}`, 30, 10 * 60 * 1000);
  if (!rl.allowed) {
    return rateLimitedResponse(rl);
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Azione non valida' }, { status: 400 });
    }
    const { action } = parsed.data;

    const card = await prisma.card.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!card) {
      return NextResponse.json({ success: false, error: 'Carta non trovata' }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'freeze':
        if (card.status === 'FROZEN') {
          return NextResponse.json({ success: false, error: 'La carta è già congelata' }, { status: 400 });
        }
        updateData = { status: 'FROZEN' };
        break;
      case 'unfreeze':
        if (card.status !== 'FROZEN') {
          return NextResponse.json({ success: false, error: 'La carta non è congelata' }, { status: 400 });
        }
        updateData = { status: 'ACTIVE' };
        break;
      case 'expire':
        if (card.status === 'EXPIRED') {
          return NextResponse.json({ success: false, error: 'La carta è già scaduta' }, { status: 400 });
        }
        updateData = { status: 'EXPIRED' };
        break;
      case 'reactivate':
        if (card.status === 'ACTIVE') {
          return NextResponse.json({ success: false, error: 'La carta è già attiva' }, { status: 400 });
        }
        updateData = { status: 'ACTIVE' };
        break;
      case 'delete':
        await prisma.card.delete({ where: { id } });
        await logAudit({
          actorId: auth.session.userId!,
          action: 'CARD_DELETE',
          entity: 'Card',
          entityId: id,
          before: card.status,
          after: 'DELETED',
        });
        return NextResponse.json({ success: true, message: 'Carta eliminata definitivamente' });
    }

    const updated = await prisma.card.update({
      where: { id },
      data: updateData,
      select: { id: true, status: true },
    });

    await logAudit({
      actorId: auth.session.userId!,
      action: `CARD_${action.toUpperCase()}`,
      entity: 'Card',
      entityId: id,
      before: card.status,
      after: updated.status,
    });

    return NextResponse.json({ success: true, card: updated });
  } catch (error) {
    console.error('Admin card action error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante l\'operazione' }, { status: 500 });
  }
}
