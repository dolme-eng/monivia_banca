import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/api-auth';

const provisionSchema = z.object({
  email: z.string().email(),
  nome: z.string().min(1),
  cognome: z.string().min(1),
  amount: z.number().positive(),
  password: z.string().min(6, 'La password deve avere almeno 6 caratteri'),
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
  const rl = checkRateLimit(`provision:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { email, nome, cognome, amount, password } = provisionSchema.parse(body);

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        update: { hashedPassword },
        create: { email, nome, cognome, hashedPassword },
      });

      const ibanRandom = randomBytes(12).toString('hex').toUpperCase().slice(0, 23);
      const iban = `IT00${ibanRandom}`;
      const account = await tx.account.create({
        data: { userId: user.id, iban, balance: 0 },
      });

      await tx.transaction.create({
        data: {
          accountId: account.id,
          type: 'CREDIT',
          amount,
          description: 'Accredito iniziale - Prestito Monivia',
          status: 'APPROVED',
          reference: `LOAN-${Date.now()}`,
        },
      });

      await tx.account.update({
        where: { id: account.id },
        data: { balance: { increment: amount } },
      });

      const cardBytes = randomBytes(8);
      const cardNumber = Array.from(cardBytes).map(b => b % 10).join('').padStart(16, '0').slice(0, 16);
      const cvvNum = randomBytes(3).readUIntBE(0, 3) % 900 + 100;
      const card = await tx.card.create({
        data: {
          accountId: account.id,
          number: cardNumber,
          cvv: cvvNum.toString(),
          expiry: '12/29',
          holder: `${nome} ${cognome}`,
        },
      });

      return { account, card };
    });

    return NextResponse.json({
      success: true,
      account: {
        iban: result.account.iban,
        balance: amount,
      },
      card: {
        number: result.card.number,
        holder: result.card.holder,
      },
    });
  } catch (error) {
    console.error('Provision error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
