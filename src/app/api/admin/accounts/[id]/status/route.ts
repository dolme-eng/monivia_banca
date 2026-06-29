import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/api-auth';
import { z } from 'zod';

const statusSchema = z.object({
  action: z.enum(['validate', 'freeze', 'unfreeze', 'block', 'unblock', 'delete']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`admin-account-action:${ip}`, 30, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = statusSchema.parse(body);

    const account = await prisma.account.findUnique({
      where: { id },
      select: { id: true, status: true, blockedAt: true },
    });

    if (!account) {
      return NextResponse.json({ success: false, error: 'Conto non trovato' }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'validate':
        if (account.status !== 'PENDING') {
          return NextResponse.json({ success: false, error: 'Il conto non è in attesa di validazione' }, { status: 400 });
        }
        updateData = { status: 'ACTIVE' };
        break;
      case 'freeze':
        if (account.status === 'FROZEN') {
          return NextResponse.json({ success: false, error: 'Il conto è già congelato' }, { status: 400 });
        }
        updateData = { status: 'FROZEN' };
        break;
      case 'unfreeze':
        if (account.status !== 'FROZEN') {
          return NextResponse.json({ success: false, error: 'Il conto non è congelato' }, { status: 400 });
        }
        updateData = { status: 'ACTIVE' };
        break;
      case 'block':
        if (account.blockedAt) {
          return NextResponse.json({ success: false, error: 'I trasferimenti sono già bloccati' }, { status: 400 });
        }
        updateData = { blockedAt: new Date() };
        break;
      case 'unblock':
        if (!account.blockedAt) {
          return NextResponse.json({ success: false, error: 'I trasferimenti non sono bloccati' }, { status: 400 });
        }
        updateData = { blockedAt: null };
        break;
      case 'delete':
        await prisma.$transaction(async (tx) => {
          await tx.transaction.deleteMany({ where: { accountId: id } });
          await tx.card.deleteMany({ where: { accountId: id } });
          await tx.account.delete({ where: { id } });
        });
        return NextResponse.json({ success: true, message: 'Conto eliminato definitivamente' });
    }

    const updated = await prisma.account.update({
      where: { id },
      data: updateData,
      select: { id: true, status: true, blockedAt: true },
    });

    return NextResponse.json({ success: true, account: updated });
  } catch (error) {
    console.error('Admin account action error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante l\'operazione' }, { status: 500 });
  }
}
