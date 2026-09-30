import { NextResponse } from 'next/server';
import { prisma } from './prisma';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /**
   * When true (default), a rate-limit store outage DENIES the request.
   * Auth and money endpoints must stay fail-closed.
   * Pass { failClosed: false } only for read-only endpoints where
   * availability matters more than throttling.
   */
  failClosed?: boolean;
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  opts: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const { failClosed = true } = opts;
  const now = Date.now();
  const resetAt = new Date(now + windowMs);
  const denied: RateLimitResult = { allowed: false, remaining: 0, resetAt: resetAt.getTime() };

  try {
    // Single interactive transaction with SELECT ... FOR UPDATE:
    // atomic increment, no lost updates, and no reliance on a UNIQUE
    // constraint (supabase-init.sql only creates a plain index on key).
    // gen_random_uuid() requires pgcrypto (enabled by default on Supabase).
    const outcome: RateLimitResult = await (prisma as any).$transaction(async (tx: any) => {
      const rows: any[] = await tx.$queryRawUnsafe(
        `SELECT count, "resetAt" FROM "RateLimitEntry" WHERE key = $1 LIMIT 1 FOR UPDATE`,
        key
      );

      if (!rows || rows.length === 0) {
        await tx.$executeRawUnsafe(
          `INSERT INTO "RateLimitEntry" (id, key, count, "resetAt") VALUES (gen_random_uuid()::text, $1, 1, to_timestamp($2 / 1000.0))`,
          key,
          resetAt.getTime()
        );
        return { allowed: true, remaining: maxRequests - 1, resetAt: resetAt.getTime() };
      }

      const entry = rows[0];
      const entryResetMs = new Date(entry.resetAt).getTime();

      if (now >= entryResetMs) {
        await tx.$executeRawUnsafe(
          `UPDATE "RateLimitEntry" SET count = 1, "resetAt" = to_timestamp($1 / 1000.0) WHERE key = $2`,
          resetAt.getTime(),
          key
        );
        return { allowed: true, remaining: maxRequests - 1, resetAt: resetAt.getTime() };
      }

      const newCount = Number(entry.count) + 1;
      await tx.$executeRawUnsafe(`UPDATE "RateLimitEntry" SET count = $1 WHERE key = $2`, newCount, key);

      if (newCount > maxRequests) {
        return { allowed: false, remaining: 0, resetAt: entryResetMs };
      }

      return { allowed: true, remaining: maxRequests - newCount, resetAt: entryResetMs };
    });
    // Probabilistic lazy cleanup (~1% of calls): the cleanup_rate_limits()
    // SQL function exists but no scheduler invokes it, so purge expired rows
    // inline instead of letting the table grow forever.
    if (Math.random() < 0.01) {
      try {
        await (prisma as any).$executeRawUnsafe(`DELETE FROM "RateLimitEntry" WHERE "resetAt" < NOW()`);
      } catch (cleanupErr) {
        console.error('[RATE-LIMIT] lazy cleanup failed');
      }
    }
    return outcome;
  } catch {
    // Never log the key: it may embed email/userId (PII).
    console.error('[RATE-LIMIT] store unavailable');
    if (failClosed) return denied;
    return { allowed: true, remaining: maxRequests, resetAt: resetAt.getTime() };
  }
}

export function getClientIp(req: Request): string {
  // Trust order matters more than it looks: this string becomes the rate-limit
  // bucket, so ANY header a client can set freely is a bypass — the attacker
  // just rotates it to get a fresh bucket per guess.
  //
  // x-real-ip is deliberately NOT trusted: on Vercel it is not a header the
  // platform rewrites, so a client can send `x-real-ip: <anything>` and, since
  // it was checked first, it won outright. It was the first thing an attacker
  // had to try.
  const vercelIp = req.headers.get('x-vercel-forwarded-for');
  if (vercelIp && vercelIp.trim()) return firstAddress(vercelIp);

  // Only meaningful if a Cloudflare proxy actually sits in front of Vercel;
  // harmless otherwise because Cloudflare overwrites this header.
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return firstAddress(cfIp);

  // Vercel appends the real client IP to x-forwarded-for, so the RIGHTMOST
  // entry is the trustworthy one; everything to its left is client-supplied.
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  // No usable IP: collapse to a single shared bucket instead of returning a
  // per-request value, so a missing header cannot be used to dodge limits.
  return 'unknown';
}

/** Some proxies send a comma separated list even in single-IP headers. */
function firstAddress(value: string): string {
  const first = value.split(',')[0]?.trim();
  return first || 'unknown';
}

/** 429 JSON response with Retry-After (seconds until window reset). */
export function rateLimitedResponse(rl: RateLimitResult, message = 'Troppe richieste') {
  const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
  return NextResponse.json({ success: false, error: message }, {
    status: 429,
    headers: { 'Retry-After': String(retryAfter) },
  });
}
