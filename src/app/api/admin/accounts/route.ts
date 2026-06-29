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
    const status = searchParams.get('status') as 'PENDING' | 'ACTIVE' | 'FROZEN' | 'CLOSED' | null;

    // If no search query and no status filter, return all accounts
    if ((!q || q.length < 2) && !status) {
      const accounts = await prisma.account.findMany({
        select: {
          id: true,
          iban: true,
          balance: true,
          currency: true,
          status: true,
          blockedAt: true,
          createdAt: true,
          user: {
            select: { id: true, email: true, nome: true, cognome: true },
          },
          cards: {
            select: { number: true, holder: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
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
    }

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (q && q.length >= 2) {
      where.OR = [
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { nome: { contains: q, mode: 'insensitive' } } },
        { user: { cognome: { contains: q, mode: 'insensitive' } } },
        { iban: { contains: q, mode: 'insensitive' } },
      ];
    }

    const accounts = await prisma.account.findMany({
      where,
      select: {
        id: true,
        iban: true,
        balance: true,
        currency: true,
        status: true,
        blockedAt: true,
        createdAt: true,
        user: {
          select: { id: true, email: true, nome: true, cognome: true },
        },
        cards: {
          select: { number: true, holder: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
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
