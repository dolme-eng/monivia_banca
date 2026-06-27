import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/api-auth';

const provisionSchema = z.object({
  email: z.string().email(),
  nome: z.string().min(1),
  cognome: z.string().min(1),
  amount: z.number().positive(),
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

  // 1. Origin check (fail-closed)
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

  // 4. Rate limiting (10 requests per 10 minutes per IP)
  const ip = getClientIp(req);
  const rl = checkRateLimit(`provision:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { email, nome, cognome, amount } = provisionSchema.parse(body);

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, nome, cognome },
    });

    const ibanRandom = randomBytes(12).toString('hex').toUpperCase().slice(0, 23);
    const iban = `IT00${ibanRandom}`;
    const account = await prisma.account.create({
      data: {
        userId: user.id,
        iban,
        balance: 0,
      },
    });

    await prisma.transaction.create({
      data: {
        accountId: account.id,
        type: 'CREDIT',
        amount: amount,
        description: 'Accredito iniziale - Prestito Monivia',
        status: 'APPROVED',
        reference: `LOAN-${Date.now()}`,
      },
    });

    await prisma.account.update({
      where: { id: account.id },
      data: { balance: { increment: amount } },
    });

    const cardBytes = randomBytes(8);
    const cardNumber = Array.from(cardBytes).map(b => b % 10).join('').padStart(16, '0').slice(0, 16);
    const cvvNum = randomBytes(3).readUIntBE(0, 3) % 900 + 100;
    const card = await prisma.card.create({
      data: {
        accountId: account.id,
        number: cardNumber,
        cvv: cvvNum.toString(),
        expiry: '12/29',
        holder: `${nome} ${cognome}`,
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        iban: account.iban,
        balance: amount,
      },
      card: {
        number: card.number,
        holder: card.holder,
      },
    });
  } catch (error) {
    console.error('Provision error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
