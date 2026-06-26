import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const pendingTransactions = await prisma.transaction.findMany({
      where: { status: 'PENDING' },
      include: {
        account: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const notifications = pendingTransactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Math.abs(tx.amount),
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
