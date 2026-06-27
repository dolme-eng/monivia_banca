import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        nome: true,
        cognome: true,
        role: true,
        accounts: {
          select: {
            id: true,
            iban: true,
            balance: true,
            currency: true,
            status: true,
            cards: {
              select: {
                id: true,
                number: true,
                expiry: true,
                holder: true,
                status: true,
              },
            },
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Utente non trovato' }, { status: 404 });
    }

    const maskedUser = {
      ...user,
      accounts: user.accounts.map((acc) => ({
        ...acc,
        balance: Number(acc.balance),
        cards: acc.cards.map((card) => ({
          ...card,
          number: '•••• •••• •••• ' + card.number.slice(-4),
        })),
        transactions: acc.transactions.map((tx) => ({
          ...tx,
          amount: Number(tx.amount),
        })),
      })),
    };

    const totalBalance = maskedUser.accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const allTransactions = maskedUser.accounts.flatMap((acc) => acc.transactions);

    return NextResponse.json({
      success: true,
      user: {
        ...maskedUser,
        totalBalance,
        recentTransactions: allTransactions
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10),
      },
    });
  } catch (error) {
    console.error('User account error:', error);
    return NextResponse.json({ success: false, error: 'Errore nel recupero dei dati' }, { status: 500 });
  }
}
