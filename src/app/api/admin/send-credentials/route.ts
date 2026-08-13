import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { validateCsrfToken } from '@/lib/csrf';
import { sendClientWelcomeEmail } from '@/lib/email-notify';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  if (!checkOrigin(req)) {
    return NextResponse.json({ success: false, error: 'Accesso negato' }, { status: 403 });
  }

  const csrfToken = req.headers.get('x-csrf-token');
  if (!validateCsrfToken(csrfToken)) {
    return NextResponse.json({ success: false, error: 'Token CSRF non valido' }, { status: 403 });
  }

  try {
    const { userId, email, nome, cognome, iban, cardLast4, inviteUrl } = await req.json();

    if (!email || !nome || !cognome) {
      return NextResponse.json({ success: false, error: 'Dati mancanti' }, { status: 400 });
    }

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

    await sendClientWelcomeEmail({
      clientEmail: email,
      clientNome: nome,
      clientCognome: cognome,
      iban: iban || '',
      cardLast4: cardLast4 || '',
      inviteUrl: inviteUrl || '',
    });

    return NextResponse.json({ success: true, message: 'Email inviata con successo' });
  } catch (error) {
    console.error('Send client email error:', error);
    return NextResponse.json({ success: false, error: "Errore durante l'invio dell'email" }, { status: 500 });
  }
}
