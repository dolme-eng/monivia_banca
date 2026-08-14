import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const results: string[] = [];

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

    try {
      await (prisma as any).$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "Transaction" ADD CONSTRAINT transaction_description_length CHECK (length("description") <= 255);
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
      results.push('Description length constraint added');
    } catch (e: any) {
      results.push(`Description constraint: ${e.message}`);
    }

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
