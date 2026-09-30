import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';

/**
 * TEMPORARY migration diagnostics. Reports what the database ACTUALLY contains
 * versus what the Prisma schema and the migration folders claim.
 *
 * Needed because `prisma migrate status` cannot run locally (incomplete
 * node_modules) and Supabase's pooler port 6543 is rejected by the CLI, so the
 * migration history was unknown and `migrate deploy` was therefore unsafe.
 *
 * Admin-only, CSRF-protected, origin-checked, rate-limited, read-only, and it
 * returns no row data — schema metadata only. Remove once the migrations are
 * reconciled and recorded.
 */
const TABLES = [
  'User', 'Account', 'Card', 'Transaction', 'RefreshToken',
  'InviteToken', 'PasswordResetToken', 'RateLimitEntry', 'AuditLog',
];

export async function GET(req: NextRequest) {
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
  const rl = await checkRateLimit(`schema-introspect:${auth.session.userId}:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) return rateLimitedResponse(rl);

  try {
    const q = async (sql: string, params: unknown[] = []) =>
      (await prisma.$queryRawUnsafe(sql, ...params)) as Record<string, unknown>[];

    const columns = await q(
      `SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ANY($1)
        ORDER BY table_name, ordinal_position`,
      [TABLES]
    );

    const byTable: Record<
      string,
      { name: string; type: string; udt: string; nullable: string; default: string | null }[]
    > = {};
    for (const c of columns) {
      const t = String(c.table_name);
      (byTable[t] ||= []).push({
        name: String(c.column_name),
        type: String(c.data_type),
        udt: String(c.udt_name),
        nullable: String(c.is_nullable),
        default: c.column_default === null ? null : String(c.column_default),
      });
    }

    // Referential actions matter: schema.prisma declares Cascade on these
    // relations while add_refresh_token.sql created RESTRICT. The live action
    // is what a baseline has to record.
    const fks = await q(
      `SELECT tc.table_name, tc.constraint_name, kcu.column_name,
              ccu.table_name AS foreign_table, ccu.column_name AS foreign_column,
              rc.update_rule, rc.delete_rule
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
         JOIN information_schema.referential_constraints rc
           ON rc.constraint_name = tc.constraint_name
          AND rc.constraint_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name`
    );

    const indexes = await q(
      `SELECT tablename AS table_name, indexname AS name, indexdef AS def
         FROM pg_indexes WHERE schemaname = 'public'
        ORDER BY tablename, indexname`
    );

    const checks = await q(
      `SELECT conrelid::regclass::text AS tbl, conname, pg_get_constraintdef(oid) AS def
         FROM pg_constraint
        WHERE contype = 'c' AND connamespace = 'public'::regnamespace
        ORDER BY tbl, conname`
    );

    // _prisma_migrations missing entirely means the CLI never ran here, which
    // is the root cause of the whole drift.
    let migrations: { name: string; state: string }[] = [];
    let migrationsTable = false;
    try {
      const rows = await q(
        `SELECT migration_name, finished_at, rolled_back_at
           FROM _prisma_migrations ORDER BY started_at`
      );
      migrationsTable = true;
      migrations = rows.map((r) => ({
        name: String(r.migration_name),
        state: r.finished_at ? 'OK' : r.rolled_back_at ? 'ROLLED_BACK' : 'PENDING',
      }));
    } catch {
      migrationsTable = false;
    }

    const counts: Record<string, number> = {};
    for (const t of TABLES) {
      try {
        const r = await q(`SELECT COUNT(*)::int AS n FROM "${t}"`);
        counts[t] = Number(r[0]?.n ?? 0);
      } catch {
        counts[t] = -1;
      }
    }

    const enums = await q(
      `SELECT t.typname AS name, e.enumlabel AS value
         FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = ANY($1) ORDER BY t.typname, e.enumsortorder`,
      [['AccountStatus', 'TransactionStatus', 'CardStatus', 'UserRole', 'TransactionType']]
    );
    const enumValues: Record<string, string[]> = {};
    for (const e of enums) {
      (enumValues[String(e.name)] ||= []).push(String(e.value));
    }

    return NextResponse.json({
      success: true,
      migrationsTable,
      migrations,
      tables: byTable,
      checkConstraints: checks,
      foreignKeys: fks,
      indexes,
      enumValues,
      rowCounts: counts,
    });
  } catch (error) {
    console.error('[schema-introspect]', error);
    return NextResponse.json(
      { success: false, error: 'Introspection failed' },
      { status: 500 }
    );
  }
}