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
  password: z.string().min(8, 'La password deve avere almeno 8 caratteri'),
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
  const rl = await checkRateLimit(`provision:${ip}`, 10, 10 * 60 * 1000);
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
        update: { hashedPassword, nome, cognome },
        create: { email, nome, cognome, hashedPassword },
      });

      const existingAccount = await tx.account.findFirst({
        where: { userId: user.id },
        select: { id: true, iban: true, balance: true },
      });

      if (existingAccount) {
        await tx.transaction.create({
          data: {
            accountId: existingAccount.id,
            type: 'CREDIT',
            amount,
            description: 'Accredito aggiuntivo - Prestito Monivia',
            status: 'APPROVED',
            reference: `TOPUP-${Date.now()}`,
          },
        });

        const updatedAccount = await tx.account.update({
          where: { id: existingAccount.id },
          data: { balance: { increment: Number(amount) } },
          select: { iban: true, balance: true },
        });

        const card = await tx.card.findFirst({
          where: { accountId: existingAccount.id },
          select: { number: true, holder: true },
        });

        return {
          account: { iban: updatedAccount.iban, balance: updatedAccount.balance },
          card: card
            ? { number: '•••• •••• •••• ' + card.number.slice(-4), holder: card.holder }
            : null,
          isNew: false,
        };
      }

      const ibanRandom = randomBytes(12).toString('hex').toUpperCase().slice(0, 23);
      const iban = `IT00${ibanRandom}`;
      const account = await tx.account.create({
        data: { userId: user.id, iban, balance: 0, status: 'PENDING' },
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

      const updatedAccount = await tx.account.update({
        where: { id: account.id },
        data: { balance: { increment: Number(amount) } },
        select: { iban: true, balance: true },
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

      return {
        account: { iban: updatedAccount.iban, balance: updatedAccount.balance },
        card: { number: '•••• •••• •••• ' + cardNumber.slice(-4), holder: `${nome} ${cognome}` },
        isNew: true,
      };
    });

    return NextResponse.json({
      success: true,
      account: result.account,
      card: result.card,
      isNew: result.isNew,
      password: result.isNew ? password : undefined,
    });
  } catch (error) {
    console.error('Provision error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante il provisioning' }, { status: 500 });
  }
}
