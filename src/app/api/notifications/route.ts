import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    const pendingTransactions = await prisma.transaction.findMany({
      where: { status: 'PENDING' },
      include: {
        account: {
          select: {
            id: true, iban: true, balance: true, currency: true, status: true,
            user: { select: { id: true, email: true, nome: true, cognome: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const notifications = pendingTransactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Math.abs(Number(tx.amount)),
      description: tx.description,
      reference: tx.reference,
      client: {
        nome: tx.account.user.nome,
        cognome: tx.account.user.cognome,
        email: tx.account.user.email,
      },
      iban: tx.account.iban,
      createdAt: tx.createdAt,
    }));

    return NextResponse.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error('Notifications error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
