import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/api-auth';
import { z } from 'zod';

const txActionSchema = z.object({
  action: z.enum(['cancel', 'pause']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`admin-tx-action:${ip}`, 30, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = txActionSchema.parse(body);

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
      const updated = await prisma.transaction.update({
        where: { id },
        data: { status: 'CANCELLED' },
        select: { id: true, status: true },
      });
      return NextResponse.json({ success: true, transaction: updated });
    }

    // action === 'pause' — keeps it PENDING (no-op, just confirmation)
    return NextResponse.json({ success: true, transaction: tx, message: 'La transazione rimane in attesa' });
  } catch (error) {
    console.error('Admin transaction action error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante l\'operazione' }, { status: 500 });
  }
}
