import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { hashToken, newToken } from '@/lib/tokens';
import { encryptPan, hashPan } from '@/lib/pan-crypto';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';
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

/**
 * Unbiased random string over an alphabet: rejection sampling discards
 * out-of-range bytes instead of `b % alphabet.length` (which biases toward
 * the first 256 % length symbols). NIST SP 800-90Ar1 style.
 */
function unbiasedSample(n: number, alphabet: string): string {
  const m = alphabet.length;
  const limit = 256 - (256 % m);
  let out = '';
  while (out.length < n) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    for (const b of bytes) {
      if (out.length >= n) break;
      if (b < limit) out += alphabet[b % m];
    }
  }
  return out;
}

function generateLuhnCard(): string {
  const randomDigits = unbiasedSample(15, '0123456789');
  for (let d = 0; d <= 9; d++) {
    const candidate = randomDigits + d;
    if (luhnCheck(candidate)) return candidate;
  }
  return randomDigits + '0';
}

function generateItalianIban(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const body = unbiasedSample(23, chars);
  
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

const ALLOWED_ORIGINS = ['https://banca.monivia.it', 'https://monivia.it'];

const provisionSchema = z.object({
  email: z.string().email().max(254),
  nome: z.string().min(1).max(100).trim(),
  cognome: z.string().min(1).max(100).trim(),
  amount: z.number().positive().max(1000000),
  password: z.string()
    .min(8, 'La password deve avere almeno 8 caratteri')
    .max(128, 'La password non può superare 128 caratteri')
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
  const rl = await checkRateLimit(`provision:${auth.session.userId}:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return rateLimitedResponse(rl);
  }

  try {
    const body = await req.json();
    const parsed = provisionSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, error: firstError?.message || 'Dati non validi' },
        { status: 400 }
      );
    }
    const { email, nome, cognome, amount, password } = parsed.data;

    // Round to cents once: IEEE floats must never reach money columns raw
    const cents = Math.round(amount * 100) / 100;

    // Invite material is pre-generated so the row can be created INSIDE the
    // transaction below — no orphan credited account if invite creation fails
    const inviteTokenRaw = newToken(32);
    const inviteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
        select: { id: true, iban: true, balance: true, status: true },
      });

      if (existingAccount) {
        // Never credit frozen/closed accounts — unfreeze first
        if (existingAccount.status === 'FROZEN' || existingAccount.status === 'CLOSED') {
          return { success: false as const, error: 'Il conto è congelato o chiuso. Scongelalo prima di accreditare.' };
        }
        await tx.transaction.create({
          data: {
            accountId: existingAccount.id,
            type: 'CREDIT',
            amount: cents,
            description: 'Accredito aggiuntivo - Prestito Monivia',
            status: 'APPROVED',
            reference: `TOPUP-${randomUUID()}`,
          },
        });

        const updatedAccount = await tx.account.update({
          where: { id: existingAccount.id },
          data: { balance: { increment: cents } },
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
          userId: user.id,
        };
      }

      // Collision-safe generation: pre-check uniqueness so a duplicate surfaces
      // here (retry) instead of as a 500 P2002. Residual concurrent races are
      // astronomically unlikely and still fail closed via the unique constraint.
      let iban = '';
      for (let i = 0; i < 5; i++) {
        const candidate = generateItalianIban();
        const taken = await tx.account.findUnique({ where: { iban: candidate }, select: { id: true } });
        if (!taken) { iban = candidate; break; }
      }
      if (!iban) throw new Error('IBAN collision');
      const account = await tx.account.create({
        data: { userId: user.id, iban, balance: 0, status: 'PENDING' },
      });

      await tx.transaction.create({
        data: {
          accountId: account.id,
          type: 'CREDIT',
          amount: cents,
          description: 'Accredito iniziale - Prestito Monivia',
          status: 'APPROVED',
          reference: `LOAN-${randomUUID()}`,
        },
      });

      const updatedAccount = await tx.account.update({
        where: { id: account.id },
        data: { balance: { increment: cents } },
        select: { iban: true, balance: true },
      });

      let cardNumber = '';
      let numberHash = '';
      for (let i = 0; i < 5; i++) {
        const candidate = generateLuhnCard();
        const h = hashPan(candidate);
        const taken = await tx.card.findUnique({ where: { numberHash: h }, select: { id: true } });
        if (!taken) { cardNumber = candidate; numberHash = h; break; }
      }
      if (!cardNumber) throw new Error('Card collision');
      const last4 = cardNumber.slice(-4);
      // Card expiry: 4 years from issuance (was hardcoded '12/29' for all cards)
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 4);
      const expiry = `${String(expDate.getMonth() + 1).padStart(2, '0')}/${String(expDate.getFullYear()).slice(-2)}`;
      // Encrypted PAN for admin/client reveal. Best-effort: if CARD_PAN_SECRET
      // is not configured, the card is still issued but full reveal stays
      // unavailable (panEnc NULL) — provisioning never breaks on this.
      let panEnc: string | null = null;
      try {
        panEnc = encryptPan(cardNumber);
      } catch {
        console.error('PAN encryption skipped: CARD_PAN_SECRET not configured');
      }
      const card = await tx.card.create({
        data: {
          accountId: account.id,
          numberHash,
          last4,
          panEnc,
          expiry,
          holder: `${nome} ${cognome}`,
        },
      });

      // Invite row lives in the same transaction: no orphan account possible
      await tx.inviteToken.create({
        data: {
          token: hashToken(inviteTokenRaw),
          userId: user.id,
          email,
          nome,
          cognome,
          expiresAt: inviteExpiresAt,
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

    if (result.isNew) {
      // Row already created inside the transaction; only build the link here
      const inviteToken = inviteTokenRaw;

      let inviteOrigin = 'https://banca.monivia.it';
      try {
        const originHeader = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'https://banca.monivia.it';
        const originUrl = new URL(originHeader);
        if (ALLOWED_ORIGINS.includes(originUrl.origin)) {
          inviteOrigin = originUrl.origin;
        }
      } catch {
        inviteOrigin = 'https://banca.monivia.it';
      }
      inviteUrl = `${inviteOrigin}/invite/${inviteToken}`;

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
  } catch (error: unknown) {
    // Server log keeps details for debugging; the client only gets a generic message.
    console.error('Provision error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Errore durante il provisioning' }, { status: 500 });
  }
}
