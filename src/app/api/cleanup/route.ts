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

    // Migration 1: CHECK constraint on balance
    try {
      await (prisma as any).$executeRawUnsafe(
        `ALTER TABLE "Account" ADD CONSTRAINT IF NOT EXISTS account_balance_non_negative CHECK (balance >= 0)`
      );
      results.push('CHECK constraint added');
    } catch (e: any) {
      results.push(`CHECK constraint: ${e.message?.includes('already exists') ? 'already exists' : e.message}`);
    }

    // Migration 2: updatedAt on RefreshToken
    try {
      await (prisma as any).$executeRawUnsafe(
        `ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`
      );
      results.push('RefreshToken.updatedAt added');
    } catch (e: any) {
      results.push(`RefreshToken.updatedAt: ${e.message?.includes('already exists') ? 'already exists' : e.message}`);
    }

    // Migration 3: updatedAt on InviteToken
    try {
      await (prisma as any).$executeRawUnsafe(
        `ALTER TABLE "InviteToken" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`
      );
      results.push('InviteToken.updatedAt added');
    } catch (e: any) {
      results.push(`InviteToken.updatedAt: ${e.message?.includes('already exists') ? 'already exists' : e.message}`);
    }

    // Migration 4: updatedAt on PasswordResetToken
    try {
      await (prisma as any).$executeRawUnsafe(
        `ALTER TABLE "PasswordResetToken" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`
      );
      results.push('PasswordResetToken.updatedAt added');
    } catch (e: any) {
      results.push(`PasswordResetToken.updatedAt: ${e.message?.includes('already exists') ? 'already exists' : e.message}`);
    }

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
