import { prisma } from './prisma';

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    const [result] = await (prisma as any).$queryRaw<[{ count: bigint; reset_at: Date }]>`
      INSERT INTO "RateLimitEntry" (key, count, "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT (key) DO UPDATE
      SET count = CASE
        WHEN "RateLimitEntry"."resetAt" <= NOW() THEN 1
        ELSE "RateLimitEntry".count + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitEntry"."resetAt" <= NOW() THEN ${resetAt}
        ELSE "RateLimitEntry"."resetAt"
      END
      RETURNING count, "resetAt" as reset_at
    `;

    const currentCount = Number(result.count);
    const currentResetAt = new Date(result.reset_at).getTime();

    if (currentCount > maxRequests) {
      return { allowed: false, remaining: 0, resetAt: currentResetAt };
    }

    return { allowed: true, remaining: maxRequests - currentCount, resetAt: currentResetAt };
  } catch (err) {
    console.error('[RATE-LIMIT] Errore Supabase, fallback bloccato:', err);
    return { allowed: false, remaining: 0, resetAt: resetAt.getTime() };
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}
