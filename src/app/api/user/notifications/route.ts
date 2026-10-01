import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export interface ClientNotification {
  key: string;
  title: string;
  detail: string;
  createdAt: string;
  href: string;
  tone: 'info' | 'success' | 'warning';
}

/**
 * Notifications for the client, on their own account only.
 *
 * Events are DERIVED from data that already exists (Transaction / Account), not
 * stored as notification rows: an approved payment is simply a transaction
 * whose status is APPROVED. The only persisted piece is NotificationSeen, which
 * records which events the client has already been shown — without it, every
 * page load would replay the same list and the client could never tell what is
 * new.
 *
 * Deliberately neutral wording: the client is never told which admin acted.
 */
async function buildEvents(userId: string): Promise<ClientNotification[]> {
  const events: ClientNotification[] = [];

  const transactions = await prisma.transaction.findMany({
    where: { account: { userId } },
    select: {
      id: true,
      type: true,
      amount: true,
      status: true,
      description: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  for (const tx of transactions) {
    const amount = Math.abs(Number(tx.amount));
    const when = tx.createdAt.toISOString();

    if (tx.status === 'PENDING') {
      events.push({
        key: `tx:${tx.id}:pending`,
        title: 'Pagamento in attesa di approvazione',
        detail: `${tx.description} · ${amount.toFixed(2)} €`,
        createdAt: when,
        href: '/dashboard/transactions',
        tone: 'info',
      });
    } else if (tx.status === 'APPROVED') {
      events.push({
        key: `tx:${tx.id}:approved`,
        title: 'Pagamento eseguito',
        detail: `${tx.description} · ${amount.toFixed(2)} €`,
        createdAt: when,
        href: '/dashboard/transactions',
        tone: 'success',
      });
    } else if (tx.status === 'REJECTED') {
      events.push({
        key: `tx:${tx.id}:rejected`,
        title: 'Pagamento non eseguito',
        detail: `${tx.description} · ${amount.toFixed(2)} €`,
        createdAt: when,
        href: '/dashboard/transactions',
        tone: 'warning',
      });
    }
  }

  const account = await prisma.account.findFirst({
    where: { userId },
    select: { id: true, status: true },
  });

  if (account?.status === 'FROZEN') {
    events.push({
      key: `account:${account.id}:frozen`,
      title: 'Conto congelato',
      detail: 'Le operazioni sono sospese. Contatta l\'amministrazione.',
      createdAt: new Date().toISOString(),
      href: '/dashboard',
      tone: 'warning',
    });
  }

  events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return events;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const ip = getClientIp(req);
  const rl = await checkRateLimit(
    `client-notifications:${auth.session.userId}:${ip}`,
    60,
    10 * 60 * 1000,
    { failClosed: false }
  );
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const events = await buildEvents(auth.session.userId!);

    const seen = await prisma.notificationSeen.findMany({
      where: { userId: auth.session.userId },
      select: { eventKey: true },
    });
    const seenKeys = new Set(seen.map((s) => s.eventKey));

    const unread = events.filter((e) => !seenKeys.has(e.key));

    return NextResponse.json({
      success: true,
      unreadCount: unread.length,
      notifications: unread.slice(0, 20),
    });
  } catch (error) {
    console.error('Client notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Impossibile caricare le notifiche' },
      { status: 500 }
    );
  }
}

/** Marks every currently unread event as read. */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  try {
    const events = await buildEvents(auth.session.userId!);

    // Skip whatever is already marked: the unique index on (userId, eventKey)
    // makes a repeat call harmless instead of throwing.
    const existing = await prisma.notificationSeen.findMany({
      where: { userId: auth.session.userId },
      select: { eventKey: true },
    });
    const seenKeys = new Set(existing.map((e) => e.eventKey));
    const fresh = events.filter((e) => !seenKeys.has(e.key));

    if (fresh.length > 0) {
      await prisma.notificationSeen.createMany({
        data: fresh.map((e) => ({ userId: auth.session.userId!, eventKey: e.key })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ success: true, marked: fresh.length });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    return NextResponse.json(
      { success: false, error: 'Impossibile aggiornare le notifiche' },
      { status: 500 }
    );
  }
}
