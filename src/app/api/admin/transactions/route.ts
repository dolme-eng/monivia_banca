import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sendClientTransactionUpdate } from '@/lib/email-notify';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';

const approvalSchema = z.object({
  transactionId: z.string(),
  action: z.enum(['APPROVE', 'REJECT']),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
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
    return NextResponse.json({ success: false, error: 'Token CSRF non valido' }, { status: 403 });
  }

  // 4. Rate limiting (30 requests per 10 minutes per IP)
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`admin:${ip}`, 30, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { transactionId, action } = approvalSchema.parse(body);

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { account: { include: { user: true } } },
    });

    if (!transaction || transaction.status !== 'PENDING') {
      return NextResponse.json({ success: false, error: 'Transazione non trovata o non in sospeso' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (action === 'APPROVE') {
        if (transaction.type === 'DEBIT' || transaction.type === 'TRANSFER_OUT') {
          const currentAccount = await tx.account.findUnique({ where: { id: transaction.accountId } });
          if (!currentAccount || Number(currentAccount.balance) < Number(transaction.amount)) {
            return { success: false, error: 'Fondi insufficienti per questa transazione' };
          }
        }

        await tx.transaction.update({
          where: { id: transactionId },
          data: { status: 'APPROVED' },
        });

        if (transaction.type === 'DEBIT' || transaction.type === 'TRANSFER_OUT') {
          await tx.account.update({
            where: { id: transaction.accountId },
            data: { balance: { decrement: Math.abs(Number(transaction.amount)) } },
          });
        } else if (transaction.type === 'CREDIT' || transaction.type === 'TRANSFER_IN') {
          await tx.account.update({
            where: { id: transaction.accountId },
            data: { balance: { increment: Math.abs(Number(transaction.amount)) } },
          });
        }
      } else {
        await tx.transaction.update({
          where: { id: transactionId },
          data: { status: 'REJECTED' },
        });
      }

      return { success: true, message: `Transazione ${action === 'APPROVE' ? 'approvata' : 'rifiutata'}` };
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    sendClientTransactionUpdate({
      clientEmail: transaction.account.user.email,
      clientNome: transaction.account.user.nome,
      type: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      transactionType: transaction.type === 'DEBIT' ? 'Prelievo' : transaction.type === 'TRANSFER_OUT' ? 'Trasferimento' : transaction.type,
      amount: Number(transaction.amount),
      description: transaction.description,
    }).catch((err) => console.error('Email notification failed:', err));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Approval error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante l\'elaborazione' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  // Rate limiting (read endpoint, less restrictive)
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`admin-read:${ip}`, 60, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where = status && ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)
      ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' }
      : {};

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: {
            select: {
              id: true, iban: true, balance: true, currency: true, status: true,
              user: { select: { id: true, email: true, nome: true, cognome: true, role: true } },
            },
          },
        },
        orderBy: { createdAt: status ? 'desc' : 'asc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({ transactions, total, page, limit });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Impossibile recuperare le transazioni' }, { status: 500 });
  }
}
