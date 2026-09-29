import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';
import { getEmailStats, getSmtpConfig, sendTestEmail } from '@/lib/email-notify';

const schema = z.object({
  to: z.string().email('Email non valida').max(254),
});

/**
 * Admin-only SMTP diagnostics. Sends a real message and returns the provider's
 * verbatim error, so a delivery failure can be diagnosed from the dashboard
 * instead of guessed at from server logs.
 * Rate-limited hard: 5 per 10 minutes.
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
  const rl = await checkRateLimit(`email-test:${auth.session.userId}:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return rateLimitedResponse(rl);
  }

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Email non valida' }, { status: 400 });
    }

    const result = await sendTestEmail(parsed.data.to);

    return NextResponse.json({
      success: result.ok,
      error: result.ok ? null : result.error,
      smtp: getSmtpConfig(),
      stats: getEmailStats(),
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Errore interno' }, { status: 500 });
  }
}
