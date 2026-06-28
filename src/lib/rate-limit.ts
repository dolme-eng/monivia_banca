import { prisma } from './prisma';

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    const existing = await (prisma as any).rateLimitEntry.findUnique({
      where: { key },
    });

    if (!existing || now > existing.resetAt) {
      await (prisma as any).rateLimitEntry.upsert({
        where: { key },
        update: { count: 1, resetAt },
        create: { key, count: 1, resetAt },
      });
      return { allowed: true, remaining: maxRequests - 1, resetAt: resetAt.getTime() };
    }

    const newCount = existing.count + 1;

    if (newCount > maxRequests) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt.getTime() };
    }

    await (prisma as any).rateLimitEntry.update({
      where: { key },
      data: { count: newCount },
    });

    return { allowed: true, remaining: maxRequests - newCount, resetAt: existing.resetAt.getTime() };
  } catch (err) {
    console.error('[RATE-LIMIT] Errore Supabase, fallback permesso:', err);
    return { allowed: true, remaining: maxRequests - 1, resetAt: resetAt.getTime() };
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}
