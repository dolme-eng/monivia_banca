import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { sendAdminInviteNotification } from '@/lib/email-notify';

function luhnCheck(num: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alternate) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function generateLuhnCard(): string {
  const randomDigits = Array.from(crypto.getRandomValues(new Uint8Array(15)), (b) => b % 10).join('');
  for (let d = 0; d <= 9; d++) {
    const candidate = randomDigits + d;
    if (luhnCheck(candidate)) return candidate;
  }
  return randomDigits + '0';
}

function generateItalianIban(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomValues = crypto.getRandomValues(new Uint8Array(23));
  const body = Array.from(randomValues, (b) => chars[b % chars.length]).join('');
  
  // Compute check digits using mod-97 algorithm
  // IBAN validation: move first 4 chars to end, convert letters to numbers (A=10, B=11, ...), then mod 97
  const rearranged = body + 'IT' + '00'; // Replace check digits with 00 for calculation
  const numeric = rearranged.split('').map(c => {
    if (c >= '0' && c <= '9') return c;
    return (c.charCodeAt(0) - 55).toString(); // A=10, B=11, ...
  }).join('');
  
  // Compute mod 97
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }
  const checkDigits = (98 - remainder).toString().padStart(2, '0');
  
  return `IT${checkDigits}${body}`;
}

const provisionSchema = z.object({
  email: z.string().email(),
  nome: z.string().min(1),
  cognome: z.string().min(1),
  amount: z.number().positive(),
  password: z.string()
    .min(8, 'La password deve avere almeno 8 caratteri')
    .regex(/[A-Z]/, 'La password deve contenere almeno una lettera maiuscola')
    .regex(/[a-z]/, 'La password deve contenere almeno una lettera minuscola')
    .regex(/[0-9]/, 'La password deve contenere almeno un numero')
    .regex(/[^A-Za-z0-9]/, 'La password deve contenere almeno un carattere speciale'),
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
  const rl = await checkRateLimit(`provision:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { email, nome, cognome, amount, password } = provisionSchema.parse(body);

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email } });
      let user;
      if (existingUser) {
        user = await tx.user.update({
          where: { id: existingUser.id },
          data: { nome, cognome },
        });
      } else {
        user = await tx.user.create({
          data: { email, nome, cognome, hashedPassword },
        });
      }

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
          select: { last4: true, holder: true },
        });

        return {
          account: { iban: updatedAccount.iban, balance: updatedAccount.balance },
          card: card
            ? { number: '•••• •••• •••• ' + card.last4, holder: card.holder }
            : null,
          isNew: false,
        };
      }

      const iban = generateItalianIban();
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

      const cardNumber = generateLuhnCard();
      const numberHash = createHash('sha256').update(cardNumber).digest('hex');
      const last4 = cardNumber.slice(-4);
      const card = await tx.card.create({
        data: {
          accountId: account.id,
          numberHash,
          last4,
          expiry: '12/29',
          holder: `${nome} ${cognome}`,
        },
      });

      return {
        account: { iban: updatedAccount.iban, balance: updatedAccount.balance },
        card: { number: '•••• •••• •••• ' + last4, holder: `${nome} ${cognome}` },
        isNew: true,
        userId: user.id,
      };
    });

    let inviteUrl: string | undefined;
    let inviteToken: string | undefined;

    if (result.isNew) {
      inviteToken = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await prisma.inviteToken.create({
        data: {
          token: inviteToken,
          userId: result.userId!,
          email,
          nome,
          cognome,
          expiresAt,
        },
      });

      const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'https://banca.monivia.it';
      inviteUrl = `${origin}/invite/${inviteToken}`;

      try {
        await sendAdminInviteNotification({
          clientNome: nome,
          clientCognome: cognome,
          clientEmail: email,
          inviteUrl,
          amount,
        });
      } catch (e) {
        console.error('Invite email failed (non-blocking):', e);
      }
    }

    return NextResponse.json({
      success: true,
      account: result.account,
      card: result.card,
      isNew: result.isNew,
      inviteUrl,
    });
  } catch (error) {
    console.error('Provision error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante il provisioning' }, { status: 500 });
  }
}
