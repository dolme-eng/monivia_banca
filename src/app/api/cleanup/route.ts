import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CSRF_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    await (prisma as any).$executeRawUnsafe(
      `ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "consumedAt" TIMESTAMP(3)`
    );
    return NextResponse.json({ ok: true, message: 'consumedAt column added' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
