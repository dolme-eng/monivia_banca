import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CSRF_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const results: string[] = [];

    try {
      await (prisma as any).$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "Account" ADD CONSTRAINT account_balance_non_negative CHECK (balance >= 0);
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
      results.push('CHECK constraint applied');
    } catch (e: any) {
      results.push(`CHECK constraint: ${e.message}`);
    }

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
