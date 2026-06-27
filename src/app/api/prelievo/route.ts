import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sendAdminPrelievoNotification } from '@/lib/email-notify';
import { requireAuth } from '@/lib/api-auth';

const prelievoSchema = z.object({
  accountId: z.string(),
  amount: z.number().positive(),
  description: z.string().min(1),
});

function checkOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin || !host) return false;
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host || originUrl.host.endsWith(`.${host}`);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  if (!checkOrigin(req)) {
    return NextResponse.json({ success: false, error: 'Accesso negato' }, { status: 403 });
  }

  const ct = req.headers.get('content-type');
  if (!ct?.includes('application/json')) {
    return NextResponse.json({ success: false, error: 'Content-Type non valido' }, { status: 415 });
  }

  const csrfToken = req.headers.get('x-csrf-token');
  if (!validateCsrfToken(csrfToken)) {
    return NextResponse.json({ success: false, error: 'Invalid CSRF token' }, { status: 403 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`prelievo:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { accountId, amount, description } = prelievoSchema.parse(body);

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.userId !== auth.session.userId) {
      return NextResponse.json({ success: false, error: 'Conto non trovato' }, { status: 404 });
    }

    if (account.balance < amount) {
      return NextResponse.json({ success: false, error: 'Fondi insufficienti' }, { status: 400 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId,
        type: 'DEBIT',
        amount: -amount,
        description,
        status: 'PENDING',
        reference: `PRELIEVO-${Date.now()}`,
      },
      include: { account: { include: { user: true } } },
    });

    sendAdminPrelievoNotification({
      clientNome: transaction.account.user.nome,
      clientCognome: transaction.account.user.cognome,
      clientEmail: transaction.account.user.email,
      amount,
      iban: transaction.account.iban,
      description,
      transactionId: transaction.id,
    }).catch((err) => console.error('Email notification failed:', err));

    return NextResponse.json({
      success: true,
      message: 'Richiesta di prelievo inviata. In attesa di approvazione amministrativa.',
      transaction: {
        id: transaction.id,
        amount: -amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Prelievo error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
