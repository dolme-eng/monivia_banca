import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  const ip = getClientIp(req);
  const rl = checkRateLimit(`admin-stats:${ip}`, 60, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalAccounts, pendingTransactions, activeClients, totalTransactions, newAccountsThisMonth] =
      await Promise.all([
        prisma.account.count(),
        prisma.transaction.count({ where: { status: 'PENDING' } }),
        prisma.user.count({ where: { role: 'USER' } }),
        prisma.transaction.count(),
        prisma.account.count({ where: { createdAt: { gte: startOfMonth } } }),
      ]);

    const pendingList = await prisma.transaction.findMany({
      where: { status: 'PENDING' },
      include: {
        account: {
          select: {
            id: true, iban: true, balance: true, currency: true, status: true,
            user: { select: { id: true, email: true, nome: true, cognome: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    const recentTransactions = await prisma.transaction.findMany({
      include: {
        account: {
          select: {
            id: true, iban: true, balance: true, currency: true, status: true,
            user: { select: { id: true, email: true, nome: true, cognome: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      totalAccounts,
      pendingTransactions,
      activeClients,
      totalTransactions,
      newAccountsThisMonth,
      pendingList,
      recentTransactions,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ success: false, error: 'Errore nel recupero delle statistiche' }, { status: 500 });
  }
}
