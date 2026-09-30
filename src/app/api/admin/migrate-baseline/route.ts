import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';

/**
 * TEMPORARY, ONE-SHOT. Baselines `_prisma_migrations` so `prisma migrate
 * deploy` stops believing the production database is empty.
 *
 * This does the same thing as `prisma migrate resolve --applied
 * 20260930000000_baseline_current_schema`, which cannot be run from here (the
 * Prisma CLI is unusable locally and Supabase's pooler on 6543 is rejected).
 * It inserts the three bookkeeping rows Prisma expects: the table itself, the
 * migration record, and the provider lock.
 *
 * It does NOT run any migration SQL. The baseline is documentation plus a
 * record that the real schema already matches it.
 *
 * Idempotent: refuses to run twice, and refuses to run if any migration record
 * already exists.
 */
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
  const rl = await checkRateLimit(`migrate-baseline:${auth.session.userId}:${ip}`, 2, 24 * 60 * 60 * 1000);
  if (!rl.allowed) return rateLimitedResponse(rl);

  const MIGRATION = '20260930000000_baseline_current_schema';

  try {
    const existing = await prisma.$queryRawUnsafe(
      `SELECT migration_name FROM _prisma_migrations`
    ) as { migration_name: string }[];

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Des migrations sont deja enregistrees', existing },
        { status: 400 }
      );
    }

    const applied = await prisma.$transaction(async (tx) => {
      // The bookkeeping table itself. Prisma owns this shape.
      await tx.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
          "id" TEXT NOT NULL,
          "checksum" TEXT NOT NULL,
          "finished_at" TIMESTAMPTZ,
          "migration_name" TEXT NOT NULL,
          "logs" TEXT,
          "rolled_back_at" TIMESTAMPTZ,
          "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
          CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
        )
      `);

      // Provider lock: Prisma uses this to record which provider owns the
      // migration history. Without it `migrate status` errors out.
      await tx.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "_prisma_migrations_lock" (
          "id" TEXT NOT NULL,
          "provider" TEXT NOT NULL,
          CONSTRAINT "_prisma_migrations_lock_pkey" PRIMARY KEY ("id")
        )
      `);
      await tx.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations_lock" (id, provider) VALUES ('1', 'postgresql')
         ON CONFLICT (id) DO NOTHING`
      );

      // The baseline record. `applied_steps_count` matches the number of SQL
      // statements Prisma would have counted as applied; it is advisory.
      await tx.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations"
           (id, checksum, migration_name, started_at, finished_at, applied_steps_count, logs)
         VALUES (gen_random_uuid()::text, $1, $2, now(), now(), 0, $3)`,
        // Prisma verifies this SHA-256 against the migration.sql file on every
        // `migrate status`. A wrong value makes Prisma report the baseline as
        // MODIFIED and demand a reset — the exact failure we are fixing. This is
        // `Get-FileHash -Algorithm SHA256` over that exact file.
        '4c37e4c36018ab0e247a7f58f8d9cd075ef447d132d2ad3a008cf9f28aad92b5',
        MIGRATION,
        'Baseline recorded via /api/admin/migrate-baseline. Schema was applied by hand in Supabase SQL Editor; see prisma/migrations/README-MIGRATIONS.md'
      );

      return { ok: true };
    });

    const rows = await prisma.$queryRawUnsafe(
      `SELECT migration_name, finished_at, applied_steps_count FROM _prisma_migrations`
    );

    return NextResponse.json({
      success: true,
      applied,
      migrationsTable: rows,
    });
  } catch (error) {
    console.error('[migrate-baseline]', error);
    return NextResponse.json(
      { success: false, error: 'Baseline failed' },
      { status: 500 }
    );
  }
}