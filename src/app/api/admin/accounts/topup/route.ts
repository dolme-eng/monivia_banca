import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { logAudit } from '@/lib/audit';

const topupSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number().positive().max(100000),
});

/** Refusal that must roll the transaction back instead of being written. */
class RefusedTopup extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RefusedTopup';
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
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
    return NextResponse.json({ success: false, error: 'Token CSRF non valido' }, { status: 403 });
  }

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`topup:${auth.session.userId}:${ip}`, 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return rateLimitedResponse(rl);
  }

  try {
    const body = await req.json();
    const parsed = topupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Dati non validi' }, { status: 400 });
    }
    const { accountId, amount } = parsed.data;
    const cents = Math.round(amount * 100) / 100;

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({
        where: { id: accountId },
        select: { id: true, iban: true, balance: true, status: true },
      });

      // Throwing aborts the transaction, so a refusal can never leave a half
      // applied credit behind. It also keeps the callback return type a single
      // concrete shape instead of a union, which needs no narrowing.
      if (!account) {
        throw new RefusedTopup('Conto non trovato');
      }

      // Never credit frozen/closed accounts
      if (account.status === 'FROZEN' || account.status === 'CLOSED') {
        throw new RefusedTopup('Il conto è congelato o chiuso');
      }

      await tx.transaction.create({
        data: {
          accountId: account.id,
          type: 'CREDIT',
          amount: cents,
          description: 'Accredito aggiuntivo - Prestito Monivia',
          status: 'APPROVED',
          reference: `TOPUP-${randomUUID()}`,
        },
      });

      const updated = await tx.account.update({
        where: { id: account.id },
        data: { balance: { increment: cents } },
        select: { iban: true, balance: true },
      });

      return {
        accountId: account.id,
        account: { iban: updated.iban, balance: Number(updated.balance) },
      };
    });

    // Balance credit: previously unlogged. The amount and the resulting balance
    // are recorded so a disputed credit can be reconstructed.
    await logAudit({
      actorId: auth.session.userId!,
      action: 'ACCOUNT_TOPUP',
      entity: 'Account',
      entityId: result.accountId,
      after: `balance=${result.account.balance} amount=${cents.toFixed(2)} iban=${result.account.iban}`,
    });

    return NextResponse.json({ success: true, account: result.account });
  } catch (error) {
    if (error instanceof RefusedTopup) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Top-up error:', error);
    return NextResponse.json({ success: false, error: "Errore durante l'accredito" }, { status: 500 });
  }
}
