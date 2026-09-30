import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';
import { readFileSync } from 'node:fs';

/**
 * TEMPORARY. Proves the baseline migration.sql executes cleanly before anyone
 * records it as applied, without persisting anything.
 *
 * How the rollback is guaranteed: Prisma's interactive transaction commits when
 * the callback RETURNS and rolls back when it THROWS. So the SQL is executed,
 * the resulting schema is inspected, and a sentinel is thrown on purpose. A SQL
 * error throws first and is reported as a failure; reaching the sentinel means
 * every statement succeeded. Either way nothing is committed.
 */

const SENTINEL = 'ROLLBACK_DRYRUN_OK';

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

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`baseline-dryrun:${auth.session.userId}:${ip}`, 3, 10 * 60 * 1000);
  if (!rl.allowed) return rateLimitedResponse(rl);

  const sql = readFileSync(
    `${process.cwd()}/prisma/migrations/20260930000000_baseline_current_schema/migration.sql`,
    'utf8'
  );

  const EXPECTED = [
    'Account', 'AuditLog', 'Card', 'InviteToken', 'PasswordResetToken',
    'RateLimitEntry', 'RefreshToken', 'Transaction', 'User',
  ];

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(sql);

        const rows = (await tx.$queryRawUnsafe(
          `SELECT table_name, column_name FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = ANY($1)`,
          [EXPECTED]
        )) as { table_name: string; column_name: string }[];

        const seen = new Set(rows.map((r) => r.table_name));
        const missing = EXPECTED.filter((t) => !seen.has(t));
        if (missing.length > 0) {
          throw new Error(`SQL_ERROR: tables missing after baseline: ${missing.join(', ')}`);
        }

        // Unconditional rollback.
        throw new Error(SENTINEL);
      },
      { timeout: 60000, maxWait: 10000 }
    );

    // Unreachable: the callback always throws.
    return NextResponse.json(
      { success: false, error: 'Transaction committed — rollback not honoured' },
      { status: 500 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.startsWith(SENTINEL)) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        note:
          'Baseline SQL executed fully, all 9 tables present, then rolled back. ' +
          'Nothing was persisted. Safe to record as applied.',
        tablesVerified: EXPECTED,
      });
    }

    return NextResponse.json({
      success: false,
      dryRun: true,
      error: 'Baseline SQL failed — do NOT record as applied',
      detail: message.slice(0, 2000),
    });
  }
}