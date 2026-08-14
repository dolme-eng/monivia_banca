import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CSRF_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const user = await (prisma as any).$queryRawUnsafe(
      `SELECT id, email, nome, cognome, role, "failedAttempts", "lockedUntil", "hashedPassword" IS NOT NULL as has_password FROM "User" WHERE email = 'admin@monivia.it'`
    );
    return NextResponse.json({ user: user?.[0] || null });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
