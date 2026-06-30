import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/api-auth';
import { z } from 'zod';

const statusSchema = z.object({
  action: z.enum(['freeze', 'unfreeze', 'expire', 'reactivate', 'delete']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`admin-card-action:${ip}`, 30, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = statusSchema.parse(body);

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
        return NextResponse.json({ success: true, message: 'Carta eliminata definitivamente' });
    }

    const updated = await prisma.card.update({
      where: { id },
      data: updateData,
      select: { id: true, status: true },
    });

    return NextResponse.json({ success: true, card: updated });
  } catch (error) {
    console.error('Admin card action error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante l\'operazione' }, { status: 500 });
  }
}
