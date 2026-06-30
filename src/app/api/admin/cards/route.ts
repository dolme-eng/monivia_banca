import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`admin-cards:${ip}`, 60, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = {};

    if (status && ['ACTIVE', 'FROZEN', 'EXPIRED'].includes(status)) {
      where.status = status;
    }

    if (q.trim().length >= 2) {
      where.OR = [
        { holder: { contains: q.trim(), mode: 'insensitive' } },
        { number: { contains: q.trim() } },
        { account: { user: { email: { contains: q.trim(), mode: 'insensitive' } } } },
      ];
    }

    const cards = await prisma.card.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            iban: true,
            balance: true,
            status: true,
            user: { select: { id: true, email: true, nome: true, cognome: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const masked = cards.map((c) => ({
      id: c.id,
      number: '•••• •••• •••• ' + c.number.slice(-4),
      holder: c.holder,
      expiry: c.expiry,
      status: c.status,
      createdAt: c.createdAt,
      account: {
        id: c.account.id,
        iban: c.account.iban,
        balance: Number(c.account.balance),
        status: c.account.status,
        user: c.account.user,
      },
    }));

    return NextResponse.json({ success: true, cards: masked });
  } catch (error) {
    console.error('Admin cards list error:', error);
    return NextResponse.json({ success: false, error: 'Errore nel recupero delle carte' }, { status: 500 });
  }
}
