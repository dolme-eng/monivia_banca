import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { validateCsrfToken } from '@/lib/csrf';
import { sendClientWelcomeEmail } from '@/lib/email-notify';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const sendCredentialsSchema = z.object({
  userId: z.string().uuid().optional(),
  email: z.string().email().max(254),
  nome: z.string().min(1).max(100).trim(),
  cognome: z.string().min(1).max(100).trim(),
  iban: z.string().max(34).optional(),
  cardLast4: z.string().length(4).optional(),
  inviteUrl: z.string().url().max(500).optional(),
});

const ALLOWED_INVITE_ORIGINS = ['https://banca.monivia.it', 'https://monivia.it'];

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`send-credentials:${ip}`, 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe richieste.' }, { status: 429 });
  }

  if (!checkOrigin(req)) {
    return NextResponse.json({ success: false, error: 'Accesso negato' }, { status: 403 });
  }

  const csrfToken = req.headers.get('x-csrf-token');
  if (!validateCsrfToken(csrfToken)) {
    return NextResponse.json({ success: false, error: 'Token CSRF non valido' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = sendCredentialsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Dati non validi' }, { status: 400 });
    }
    const { userId, email, nome, cognome, iban, cardLast4, inviteUrl } = parsed.data;

    let user;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
      if (!user || user.email !== email) {
        return NextResponse.json({ success: false, error: 'Utente non trovato o email non corrispondente' }, { status: 400 });
      }
    } else {
      user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
      if (!user) {
        return NextResponse.json({ success: false, error: 'Utente non trovato' }, { status: 400 });
      }
    }

    let safeInviteUrl = inviteUrl || '';
    if (safeInviteUrl) {
      try {
        const url = new URL(safeInviteUrl);
        if (!ALLOWED_INVITE_ORIGINS.includes(url.origin)) {
          safeInviteUrl = '';
        }
      } catch {
        safeInviteUrl = '';
      }
    }

    await sendClientWelcomeEmail({
      clientEmail: email,
      clientNome: nome,
      clientCognome: cognome,
      iban: iban || '',
      cardLast4: cardLast4 || '',
      inviteUrl: safeInviteUrl,
    });

    return NextResponse.json({ success: true, message: 'Email inviata con successo' });
  } catch (error) {
    console.error('Send client email error:', error);
    return NextResponse.json({ success: false, error: "Errore durante l'invio dell'email" }, { status: 500 });
  }
}
