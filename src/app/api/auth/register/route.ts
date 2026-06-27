import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nome: z.string().min(1),
  cognome: z.string().min(1),
});

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Troppe registrazioni. Riprova più tardi.' }, { status: 429 });
  }

  const ct = req.headers.get('content-type');
  if (!ct?.includes('application/json')) {
    return NextResponse.json({ success: false, error: 'Content-Type non valido' }, { status: 415 });
  }

  const csrfToken = req.headers.get('x-csrf-token');
  if (!validateCsrfToken(csrfToken)) {
    return NextResponse.json({ success: false, error: 'Invalid CSRF token' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email già registrata' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        hashedPassword,
        nome: data.nome,
        cognome: data.cognome,
        role: 'USER',
      },
      select: { id: true, email: true, nome: true, cognome: true, role: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante la registrazione' }, { status: 500 });
  }
}
