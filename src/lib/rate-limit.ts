import { prisma } from './prisma';

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const resetAt = new Date(now + windowMs);

  try {
    const rows = await (prisma as any).$queryRawUnsafe(
      `SELECT count, "resetAt" FROM "RateLimitEntry" WHERE key = $1 LIMIT 1`,
      key
    );

    if (!rows || rows.length === 0) {
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO "RateLimitEntry" (key, count, "resetAt") VALUES ($1, 1, to_timestamp($2 / 1000.0))`,
        key, resetAt.getTime()
      );
      return { allowed: true, remaining: maxRequests - 1, resetAt: resetAt.getTime() };
    }

    const entry = rows[0];
    const entryResetMs = new Date(entry.resetAt).getTime();

    if (now >= entryResetMs) {
      await (prisma as any).$executeRawUnsafe(
        `UPDATE "RateLimitEntry" SET count = 1, "resetAt" = to_timestamp($1 / 1000.0) WHERE key = $2`,
        resetAt.getTime(), key
      );
      return { allowed: true, remaining: maxRequests - 1, resetAt: resetAt.getTime() };
    }

    const newCount = Number(entry.count) + 1;
    await (prisma as any).$executeRawUnsafe(
      `UPDATE "RateLimitEntry" SET count = $1 WHERE key = $2`,
      newCount, key
    );

    if (newCount > maxRequests) {
      return { allowed: false, remaining: 0, resetAt: entryResetMs };
    }

    return { allowed: true, remaining: maxRequests - newCount, resetAt: entryResetMs };
  } catch (err) {
    console.error('[RATE-LIMIT] Errore, fallback aperto:', err);
    return { allowed: true, remaining: maxRequests, resetAt: resetAt.getTime() };
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}
