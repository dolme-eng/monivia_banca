import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CSRF_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const before = await (prisma as any).$queryRawUnsafe(`SELECT key, count, "resetAt" FROM "RateLimitEntry"`);
    await (prisma as any).$executeRawUnsafe(`DELETE FROM "RateLimitEntry"`);
    await (prisma as any).$executeRawUnsafe(
      `UPDATE "User" SET "failedAttempts" = 0, "lockedUntil" = NULL WHERE email = 'admin@monivia.it'`
    );
    return NextResponse.json({ ok: true, deletedEntries: before.length, entries: before });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
