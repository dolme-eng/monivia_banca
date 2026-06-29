import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`admin-accounts:${ip}`, 60, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ accounts: [] });
    }

    const accounts = await prisma.account.findMany({
      where: {
        OR: [
          { user: { email: { contains: q, mode: 'insensitive' } } },
          { user: { nome: { contains: q, mode: 'insensitive' } } },
          { user: { cognome: { contains: q, mode: 'insensitive' } } },
          { iban: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        iban: true,
        balance: true,
        currency: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            nome: true,
            cognome: true,
          },
        },
        cards: {
          select: {
            number: true,
            holder: true,
          },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const masked = accounts.map((a) => ({
      ...a,
      balance: Number(a.balance),
      cards: a.cards.map((c) => ({
        number: '•••• •••• •••• ' + c.number.slice(-4),
        holder: c.holder,
      })),
    }));

    return NextResponse.json({ accounts: masked });
  } catch (error) {
    console.error('Admin accounts search error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante la ricerca' }, { status: 500 });
  }
}
