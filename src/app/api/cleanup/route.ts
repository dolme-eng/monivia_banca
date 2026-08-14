import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CSRF_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const rows = await (prisma as any).$queryRawUnsafe(
      `SELECT id, email, nome, cognome, role, "failedAttempts", "lockedUntil", "hashedPassword" FROM "User" WHERE email = 'admin@monivia.it'`
    );
    if (!rows || rows.length === 0) return NextResponse.json({ error: 'User not found' });

    const u = rows[0];
    const hash = u.hashedPassword;
    const matches = hash ? await bcrypt.compare('Prince2486!', hash) : false;

    return NextResponse.json({
      id: u.id, email: u.email, role: u.role,
      failedAttempts: u.failedAttempts,
      lockedUntil: u.lockedUntil,
      hasPassword: !!hash,
      passwordMatches: matches,
      hashPrefix: hash ? hash.substring(0, 7) : null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
