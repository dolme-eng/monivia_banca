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
  const rl = checkRateLimit(`tx:${ip}`, 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { accountId, type, amount, description } = transactionSchema.parse(body);

    const account = await prisma.account.findUnique({ where: { id: accountId } });

    if (!account || account.userId !== auth.session.userId) {
      return NextResponse.json({ success: false, error: 'Fondi insufficienti o conto non trovato' }, { status: 400 });
    }

    if (account.balance < amount) {
      return NextResponse.json({ success: false, error: 'Fondi insufficienti o conto non trovato' }, { status: 400 });
    }

    await prisma.transaction.create({
      data: {
        accountId,
        type: type === 'TRANSFER_OUT' ? 'TRANSFER_OUT' : 'DEBIT',
        amount: -amount,
        description,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'La tua richiesta è stata inviata ed è in attesa di approvazione amministrativa.',
    });
  } catch (error: any) {
    console.error('Transaction request error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
