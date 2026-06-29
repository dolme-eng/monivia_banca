import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { requireAuth } from '@/lib/api-auth';

const transactionSchema = z.object({
  accountId: z.string(),
  type: z.enum(['DEBIT', 'TRANSFER_OUT']),
  amount: z.number().positive(),
  description: z.string().min(1),
  toIban: z.string().optional(),
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

  // 1. Origin check
  if (!checkOrigin(req)) {
    return NextResponse.json({ success: false, error: 'Accesso negato' }, { status: 403 });
  }

  // 2. Content-Type validation
  const ct = req.headers.get('content-type');
  if (!ct?.includes('application/json')) {
    return NextResponse.json({ success: false, error: 'Content-Type non valido' }, { status: 415 });
  }

  // 3. CSRF validation
  const csrfToken = req.headers.get('x-csrf-token');
  if (!validateCsrfToken(csrfToken)) {
    return NextResponse.json({ success: false, error: 'Invalid CSRF token' }, { status: 403 });
  }

  // 4. Rate limiting (20 requests per 10 minutes per IP)
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`tx:${ip}`, 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { accountId, type, amount, description, toIban } = transactionSchema.parse(body);

    if (type === 'TRANSFER_OUT' && !toIban) {
      return NextResponse.json({ success: false, error: 'IBAN destinatario obbligatorio per i trasferimenti' }, { status: 400 });
    }

    const account = await prisma.account.findUnique({ where: { id: accountId } });

    if (!account || account.userId !== auth.session.userId) {
      return NextResponse.json({ success: false, error: 'Conto non trovato' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const pendingSum = await tx.transaction.aggregate({
        where: { accountId, status: 'PENDING', type: { in: ['DEBIT', 'TRANSFER_OUT'] } },
        _sum: { amount: true },
      });
      const pendingTotal = Number(pendingSum._sum.amount ?? 0);
      const availableBalance = Number(account.balance) - pendingTotal;

      if (availableBalance < amount) {
        return { success: false, error: 'Fondi insufficienti (transazioni in sospeso incluse)' };
      }

      await tx.transaction.create({
        data: {
          accountId,
          type: type === 'TRANSFER_OUT' ? 'TRANSFER_OUT' : 'DEBIT',
          amount: -amount,
          description,
          status: 'PENDING',
        },
      });

      return { success: true };
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'La tua richiesta è stata inviata ed è in attesa di approvazione amministrativa.',
    });
  } catch (error: any) {
    console.error('Transaction request error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante l\'invio della richiesta' }, { status: 500 });
  }
}
