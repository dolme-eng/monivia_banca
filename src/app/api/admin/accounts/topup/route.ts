import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';

const topupSchema = z.object({
  accountId: z.string(),
  amount: z.number().positive(),
});

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
  const rl = await checkRateLimit(`topup:${ip}`, 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { accountId, amount } = topupSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({
        where: { id: accountId },
        select: { id: true, iban: true, balance: true },
      });

      if (!account) {
        return { success: false, error: 'Conto non trovato' };
      }

      await tx.transaction.create({
        data: {
          accountId: account.id,
          type: 'CREDIT',
          amount,
          description: 'Accredito aggiuntivo - Prestito Monivia',
          status: 'APPROVED',
          reference: `TOPUP-${Date.now()}`,
        },
      });

      const updated = await tx.account.update({
        where: { id: account.id },
        data: { balance: { increment: Number(amount) } },
        select: { iban: true, balance: true },
      });

      return {
        success: true,
        account: { iban: updated.iban, balance: Number(updated.balance) },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Top-up error:', error);
    return NextResponse.json({ success: false, error: "Errore durante l'accredito" }, { status: 500 });
  }
}
