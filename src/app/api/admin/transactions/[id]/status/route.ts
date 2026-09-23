import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { validateCsrfToken } from '@/lib/csrf';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

const txActionSchema = z.object({
  action: z.enum(['cancel', 'pause']),
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
  const rl = await checkRateLimit(`admin-tx-action:${auth.session.userId}:${ip}`, 30, 10 * 60 * 1000);
  if (!rl.allowed) {
    return rateLimitedResponse(rl);
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = txActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Azione non valida' }, { status: 400 });
    }
    const { action } = parsed.data;

    const tx = await prisma.transaction.findUnique({
      where: { id },
      select: { id: true, status: true, type: true },
    });

    if (!tx) {
      return NextResponse.json({ success: false, error: 'Transazione non trovata' }, { status: 404 });
    }

    if (tx.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Solo le transazioni in attesa possono essere modificate' },
        { status: 400 }
      );
    }

    if (action === 'cancel') {
      // Atomic claim: only a PENDING transaction can be cancelled (approve-vs-cancel race safe)
      const updated = await prisma.transaction.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      if (updated.count !== 1) {
        return NextResponse.json(
          { success: false, error: 'Solo le transazioni in attesa possono essere modificate' },
          { status: 400 }
        );
      }
      await logAudit({
        actorId: auth.session.userId!,
        action: 'TRANSACTION_CANCEL',
        entity: 'Transaction',
        entityId: id,
        before: 'PENDING',
        after: 'CANCELLED',
      });
      return NextResponse.json({ success: true, transaction: { id, status: 'CANCELLED' } });
    }

    // action === 'pause' — keeps it PENDING (no-op, just confirmation)
    return NextResponse.json({ success: true, transaction: tx, message: 'La transazione rimane in attesa' });
  } catch (error) {
    console.error('Admin transaction action error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante l\'operazione' }, { status: 500 });
  }
}
