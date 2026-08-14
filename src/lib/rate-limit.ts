import { prisma } from './prisma';

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const resetAt = new Date(now + windowMs);

  try {
    const existing = await (prisma as any).$queryRaw<{ count: number; resetAt: Date }[]>`
      SELECT count, "resetAt" FROM "RateLimitEntry" WHERE key = ${key} LIMIT 1
    `;

    if (existing.length === 0) {
      await (prisma as any).$executeRaw`
        INSERT INTO "RateLimitEntry" (key, count, "resetAt")
        VALUES (${key}, 1, ${resetAt})
      `;
      return { allowed: true, remaining: maxRequests - 1, resetAt: resetAt.getTime() };
    }

    const entry = existing[0];
    const entryResetAt = new Date(entry.resetAt).getTime();

    if (now >= entryResetAt) {
      await (prisma as any).$executeRaw`
        UPDATE "RateLimitEntry" SET count = 1, "resetAt" = ${resetAt} WHERE key = ${key}
      `;
      return { allowed: true, remaining: maxRequests - 1, resetAt: resetAt.getTime() };
    }

    const newCount = entry.count + 1;
    await (prisma as any).$executeRaw`
      UPDATE "RateLimitEntry" SET count = ${newCount} WHERE key = ${key}
    `;

    if (newCount > maxRequests) {
      return { allowed: false, remaining: 0, resetAt: entryResetAt };
    }

    return { allowed: true, remaining: maxRequests - newCount, resetAt: entryResetAt };
  } catch (err) {
    console.error('[RATE-LIMIT] Errore, fallback bloccato:', err);
    return { allowed: false, remaining: 0, resetAt: resetAt.getTime() };
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}
