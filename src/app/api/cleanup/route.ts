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

    // 1. Re-hash card numbers with SHA-256
    try {
      await (prisma as any).$executeRawUnsafe(`
        UPDATE "Card"
        SET "numberHash" = encode(sha256("numberHash"::bytea), 'hex')
        WHERE length("numberHash") < 64
      `);
      results.push('Card numbers re-hashed with SHA-256');
    } catch (e: any) {
      results.push(`Card re-hash: ${e.message}`);
    }

    // 2. Add description varchar constraint (via CHECK)
    try {
      await (prisma as any).$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "Transaction" ADD CONSTRAINT transaction_description_length CHECK (length("description") <= 255);
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
      results.push('Transaction description length constraint added');
    } catch (e: any) {
      results.push(`Description constraint: ${e.message}`);
    }

    // 3. Verify card hashes are now proper SHA-256
    try {
      const check: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT count(*) as cnt FROM "Card" WHERE length("numberHash") < 64`
      );
      results.push(`Cards still unhashed: ${check[0]?.cnt ?? 'unknown'}`);
    } catch (e: any) {
      results.push(`Verify: ${e.message}`);
    }

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
