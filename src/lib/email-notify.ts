import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// --- Resend (primary) ---
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// --- SMTP fallback ---
// Values pasted into Vercel often carry a trailing space or newline. The server
// then compares the literal string including that whitespace and answers
// 535 authentication failed, while a hand-typed copy in another project works.
// Trim everything before handing it to nodemailer.
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

/**
 * Builds the provider from the current environment.
 *
 * Exported (and re-runnable) because the configuration is process-wide state: a
 * module-level `const` is frozen at import time, so on a serverless runtime a
 * cold start that booted without credentials stays mute for the lifetime of the
 * instance even after the variables are fixed. Calling this again re-reads the
 * environment, so a corrected configuration takes effect without a redeploy.
 */
export function refreshEmailConfig() {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  const host = (process.env.SMTP_HOST || 'smtp.hostinger.com').trim();
  const port = Number((process.env.SMTP_PORT || '').trim()) || 465;

  smtpUser = user;
  smtpPass = pass;
  smtpHost = host;
  smtpPort = port;
  smtpSecure = port === 465;

  transporter = !resend && user && pass
    ? nodemailer.createTransport({
        host,
        port,
        secure: smtpSecure,
        // Only ask for STARTTLS on the submission ports; implicit TLS already covers 465.
        requireTLS: port === 587,
        auth: { user, pass },
      })
    : null;

  return isEmailConfigured();
}

let smtpHost = '';
let smtpUser = '';
let smtpPass = '';
let smtpPort = 465;
let smtpSecure = true;

refreshEmailConfig();

export function getSmtpConfig() {
  // Never return the password. For SMTP_USER we expose only its SHAPE, which is
  // what actually matters for diagnosis: some providers reject the local part
  // alone and require the full address (user@domain) as the login.
  const at = smtpUser.indexOf('@');
  return {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    user: smtpUser ? `${smtpUser.slice(0, 2)}***` : null,
    userIsFullAddress: smtpUser.includes('@'),
    userDomain: at > -1 ? smtpUser.slice(at + 1) : null,
    passLength: smtpPass.length,
    hasPass: !!smtpPass,
    // A raw value longer than the trimmed one means the stored secret had
    // surrounding whitespace — the usual cause of a bare 535.
    passHadWhitespace:
      (process.env.SMTP_PASS || '').length !== smtpPass.length,
  };
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'Monivia <contatto@monivia.it>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@monivia.it';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Delivery telemetry. A configured provider does NOT mean mail is delivered:
// wrong SMTP credentials, unverified Resend domain or a suppressed quota all
// produce a created transporter + a failing send. Counters make that visible
// in the admin dashboard instead of only in server logs.
// Per-instance counters (serverless): they reset on cold start, which is
// acceptable for an "is it broken right now" signal.
const emailStats = { sent: 0, failed: 0, lastError: null as string | null };

export function getEmailStats() {
  return { ...emailStats, configured: isEmailConfigured() };
}

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  // Try Resend first
  if (resend) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
        headers: { 'X-Entity-View-ID': 'no-track' },
      });
      emailStats.sent += 1;
      return;
    } catch (err) {
      console.error('[EMAIL-RESEND] Failed, trying SMTP fallback:', err);
    }
  }

  // Fallback to SMTP
  if (transporter) {
    try {
      await transporter.sendMail({
        from: FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
      });
      emailStats.sent += 1;
      return;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      emailStats.failed += 1;
      emailStats.lastError = `smtp: ${reason}`;
      console.error('[EMAIL-SMTP] Failed:', err);
      // Do NOT fall through: a provider was configured and attempted, so this
      // is a delivery failure, not a missing configuration. The real reason
      // above is what the operator needs.
      return;
    }
  }

  // Genuinely no provider configured: the email is NEVER delivered. Callers
  // intentionally keep returning success (anti-enumeration), so this must be
  // loud — it is the only signal that reset/invite mails are silently bouncing.
  emailStats.failed += 1;
  emailStats.lastError = 'no-provider: set RESEND_API_KEY or SMTP_USER + SMTP_PASS';
  console.error(
    '[EMAIL-NOT-SENT] No provider configured (set RESEND_API_KEY or SMTP_*). ' +
    'Password reset, invite and approval emails are NOT being delivered.'
  );
}

export function isEmailConfigured(): boolean {
  return !!(resend || transporter);
}

/**
 * Fire a real email and report the provider's verbatim outcome.
 * Used by the admin diagnostic panel to tell a config problem apart from a
 * provider/auth/deliverability problem.
 */
export async function sendTestEmail(to: string): Promise<{ ok: boolean; error?: string }> {
  if (!resend && !transporter) {
    return { ok: false, error: 'Nessun provider configurato (RESEND_API_KEY o SMTP_USER+SMTP_PASS mancanti)' };
  }
  try {
    await sendEmail({
      to,
      subject: 'Monivia — test di configurazione email',
      html: '<div style="font-family:Arial,sans-serif"><h2>Monivia</h2><p>Email di test: la configurazione SMTP funziona.</p></div>',
    });
    if (emailStats.sent > 0) return { ok: true };
    return { ok: false, error: emailStats.lastError || 'invio non riuscito' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================
// Admin prelievo notification
// ============================================================
export async function sendAdminPrelievoNotification(data: {
  clientNome: string;
  clientCognome: string;
  clientEmail: string;
  amount: number;
  iban: string;
  description: string;
  transactionId: string;
}) {
  const amountStr = data.amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const adminUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/prelievo/${data.transactionId}`;

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; background: #f8fafc; padding: 40px 20px; color: #0a1628;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">

        <div style="background: #0a1628; padding: 28px 32px;">
          <span style="font-size: 20px; font-weight: 900; letter-spacing: -0.02em; color: #ffffff;">
            MO<span style="color: #00d4ff;">NIVIA</span>
          </span>
          <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em; color: rgba(255,255,255,0.4); margin-left: 10px;">
            Banca — Notifica Admin
          </span>
        </div>

        <div style="padding: 32px;">
          <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #92400e;">
              Un client ha richiesto un prelievo in attesa di approvazione.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Cliente</td>
              <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #0a1628; border-bottom: 1px solid #f1f5f9; text-align: right;">${escapeHtml(data.clientNome)} ${escapeHtml(data.clientCognome)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Email</td>
              <td style="padding: 10px 0; font-size: 14px; color: #0a1628; border-bottom: 1px solid #f1f5f9; text-align: right;">${escapeHtml(data.clientEmail)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Importo</td>
              <td style="padding: 10px 0; font-size: 18px; font-weight: 900; color: #0a1628; border-bottom: 1px solid #f1f5f9; text-align: right;">${amountStr} EUR</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">IBAN</td>
              <td style="padding: 10px 0; font-size: 12px; color: #0a1628; border-bottom: 1px solid #f1f5f9; text-align: right; font-family: monospace;">${escapeHtml(data.iban)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">Descrizione</td>
              <td style="padding: 10px 0; font-size: 14px; color: #0a1628; text-align: right;">${escapeHtml(data.description)}</td>
            </tr>
          </table>

          <a href="${adminUrl}" style="display: block; width: 100%; padding: 14px 0; background: #00d4ff; color: #0a1628; font-size: 14px; font-weight: 900; text-align: center; text-decoration: none; border-radius: 12px;">
            Rivedi e Approva
          </a>

          <p style="margin: 16px 0 0; font-size: 11px; color: #94a3b8; text-align: center;">
            Oppure apri il pannello amministrativo per gestire questa richiesta.
          </p>
        </div>

        <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 10px; color: #94a3b8; text-align: center;">
            ${new Date().getFullYear()} Monivia S.r.l. — P.IVA 10984760583 — OAM n. A23741
          </p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Prelievo in attesa — ${data.clientNome} ${data.clientCognome}`,
    html,
    replyTo: data.clientEmail,
  });
}

// ============================================================
// Client transaction update (approved/rejected)
// ============================================================
export async function sendClientTransactionUpdate(data: {
  clientEmail: string;
  clientNome: string;
  type: 'APPROVED' | 'REJECTED';
  transactionType: string;
  amount: number;
  description: string;
}) {
  const amountStr = Math.abs(Number(data.amount)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const isApproved = data.type === 'APPROVED';
  const statusColor = isApproved ? '#10b981' : '#ef4444';
  const statusText = isApproved ? 'Approvata' : 'Rifiutata';

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; background: #f8fafc; padding: 40px 20px; color: #0a1628;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">

        <div style="background: #0a1628; padding: 28px 32px;">
          <span style="font-size: 20px; font-weight: 900; letter-spacing: -0.02em; color: #ffffff;">
            MO<span style="color: #00d4ff;">NIVIA</span>
          </span>
          <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em; color: rgba(255,255,255,0.4); margin-left: 10px;">
            Banca
          </span>
        </div>

        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: ${statusColor}15; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
              <span style="font-size: 32px;">${isApproved ? '&#10003;' : '&#10007;'}</span>
            </div>
            <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 900; color: #0a1628;">
              Transazione ${statusText}
            </h2>
            <p style="margin: 0; font-size: 14px; color: #64748b;">
              La tua richiesta di ${escapeHtml(data.transactionType.toLowerCase())} e stata ${statusText.toLowerCase()} dall'amministrazione.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Tipo</td>
              <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #0a1628; border-bottom: 1px solid #f1f5f9; text-align: right;">${escapeHtml(data.transactionType)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Importo</td>
              <td style="padding: 10px 0; font-size: 18px; font-weight: 900; color: ${statusColor}; border-bottom: 1px solid #f1f5f9; text-align: right;">${amountStr} EUR</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">Descrizione</td>
              <td style="padding: 10px 0; font-size: 14px; color: #0a1628; text-align: right;">${escapeHtml(data.description)}</td>
            </tr>
          </table>

          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard" style="display: block; width: 100%; padding: 14px 0; background: #0a1628; color: #ffffff; font-size: 14px; font-weight: 900; text-align: center; text-decoration: none; border-radius: 12px;">
            Vai alla Dashboard
          </a>
        </div>

        <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 10px; color: #94a3b8; text-align: center;">
            ${new Date().getFullYear()} Monivia S.r.l. — P.IVA 10984760583 — OAM n. A23741
          </p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to: data.clientEmail,
    subject: `Monivia Banca — Transazione ${statusText}`,
    html,
  });
}

// ============================================================
// Admin invite notification (after provisioning)
// ============================================================
export async function sendAdminInviteNotification(data: {
  clientNome: string;
  clientCognome: string;
  clientEmail: string;
  inviteUrl: string;
  amount: number;
}) {
  const amountStr = data.amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; background: #f8fafc; padding: 40px 20px; color: #0a1628;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">

        <div style="background: #0a1628; padding: 28px 32px;">
          <span style="font-size: 20px; font-weight: 900; letter-spacing: -0.02em; color: #ffffff;">
            MO<span style="color: #00d4ff;">NIVIA</span>
          </span>
          <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em; color: rgba(255,255,255,0.4); margin-left: 10px;">
            Banca — Nuovo Cliente
          </span>
        </div>

        <div style="padding: 32px;">
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #065f46;">
              Conto creato con successo. Inoltra le credenziali al cliente.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Cliente</td>
              <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #0a1628; border-bottom: 1px solid #f1f5f9; text-align: right;">${escapeHtml(data.clientNome)} ${escapeHtml(data.clientCognome)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Email</td>
              <td style="padding: 10px 0; font-size: 14px; color: #0a1628; border-bottom: 1px solid #f1f5f9; text-align: right;">${escapeHtml(data.clientEmail)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">Importo</td>
              <td style="padding: 10px 0; font-size: 18px; font-weight: 900; color: #0a1628; text-align: right;">${amountStr} EUR</td>
            </tr>
          </table>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #64748b;">Link di invito (scade tra 24 ore):</p>
            <p style="margin: 0; font-size: 13px; color: #00d4ff; word-break: break-all; font-family: monospace;">${data.inviteUrl}</p>
          </div>

          <a href="${data.inviteUrl}" style="display: block; width: 100%; padding: 14px 0; background: #00d4ff; color: #0a1628; font-size: 14px; font-weight: 900; text-align: center; text-decoration: none; border-radius: 12px;">
            Apri Link Invito
          </a>

          <p style="margin: 16px 0 0; font-size: 11px; color: #94a3b8; text-align: center;">
            Inoltra questa email al cliente oppure copia le credenziali e il link.
          </p>
        </div>

        <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 10px; color: #94a3b8; text-align: center;">
            ${new Date().getFullYear()} Monivia S.r.l. — P.IVA 10984760583 — OAM n. A23741
          </p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Nuovo cliente — ${data.clientNome} ${data.clientCognome} — Credenziali`,
    html,
  });
}

// ============================================================
// Password reset email
// ============================================================
export async function sendPasswordResetEmail(data: {
  userName: string;
  userEmail: string;
  resetUrl: string;
}) {
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; background: #f8fafc; padding: 40px 20px; color: #0a1628;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">

        <div style="background: #0a1628; padding: 28px 32px;">
          <span style="font-size: 20px; font-weight: 900; letter-spacing: -0.02em; color: #ffffff;">
            MO<span style="color: #00d4ff;">NIVIA</span>
          </span>
          <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em; color: rgba(255,255,255,0.4); margin-left: 10px;">
            Banca — Reset Password
          </span>
        </div>

        <div style="padding: 32px;">
          <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 900; color: #0a1628;">Reimposta la tua password</h2>
          <p style="margin: 0 0 24px; font-size: 14px; color: #64748b; line-height: 1.6;">
            Ciao ${escapeHtml(data.userName)},<br/>
            Abbiamo ricevuto una richiesta di reimpostazione della password per il tuo account.
          </p>

          <a href="${data.resetUrl}" style="display: block; width: 100%; padding: 14px 0; background: #00d4ff; color: #0a1628; font-size: 14px; font-weight: 900; text-align: center; text-decoration: none; border-radius: 12px;">
            Reimposta Password
          </a>

          <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
            Questo link scade tra <strong>1 ora</strong>. Se non hai richiesto la reimpostazione, ignora questa email.
          </p>
        </div>

        <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 10px; color: #94a3b8; text-align: center;">
            ${new Date().getFullYear()} Monivia S.r.l. — P.IVA 10984760583 — OAM n. A23741
          </p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to: data.userEmail,
    subject: 'Monivia Banca — Reimposta la tua password',
    html,
  });
}

// ============================================================
// Client welcome email (sent manually by admin)
// ============================================================
export async function sendClientWelcomeEmail(data: {
  clientEmail: string;
  clientNome: string;
  clientCognome: string;
  iban: string;
  cardLast4: string;
  inviteUrl: string;
}) {
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; background: #f8fafc; padding: 40px 20px; color: #0a1628;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">

        <div style="background: #0a1628; padding: 28px 32px;">
          <span style="font-size: 20px; font-weight: 900; letter-spacing: -0.02em; color: #ffffff;">
            MO<span style="color: #00d4ff;">NIVIA</span>
          </span>
          <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em; color: rgba(255,255,255,0.4); margin-left: 10px;">
            Banca — Benvenuto
          </span>
        </div>

        <div style="padding: 32px;">
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #065f46;">
              Il tuo conto è pronto. Accedi per gestire i tuoi fondi.
            </p>
          </div>

          <p style="margin: 0 0 20px; font-size: 14px; color: #334155;">
            Ciao ${escapeHtml(data.clientNome)},
          </p>
          <p style="margin: 0 0 24px; font-size: 14px; color: #334155; line-height: 1.6;">
            Il tuo conto Monivia Banca è stato creato con successo. Qui sotto trovi le tue credenziali di accesso.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Email</td>
              <td style="padding: 10px 0; font-size: 14px; color: #0a1628; border-bottom: 1px solid #f1f5f9; text-align: right;">${escapeHtml(data.clientEmail)}</td>
            </tr>
            ${data.iban ? `
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">IBAN</td>
              <td style="padding: 10px 0; font-size: 13px; color: #0a1628; border-bottom: 1px solid #f1f5f9; text-align: right; font-family: monospace;">${escapeHtml(data.iban)}</td>
            </tr>
            ` : ''}
            ${data.cardLast4 ? `
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Carta</td>
              <td style="padding: 10px 0; font-size: 14px; color: #0a1628; border-bottom: 1px solid #f1f5f9; text-align: right; font-family: monospace;">**** **** **** ${escapeHtml(data.cardLast4)}</td>
            </tr>
            ` : ''}
          </table>

          ${data.inviteUrl ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #64748b;">Per prima accedi, imposta la tua password:</p>
            <a href="${escapeHtml(data.inviteUrl)}" style="display: block; width: 100%; padding: 14px 0; background: #00d4ff; color: #0a1628; font-size: 14px; font-weight: 900; text-align: center; text-decoration: none; border-radius: 12px;">
              Imposta la tua password
            </a>
          </div>
          ` : ''}

          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
            Una volta impostata la password, potrai accedere alla tua area personale per gestire il tuo conto, le carte e i trasferimenti.
          </p>
        </div>

        <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 10px; color: #94a3b8; text-align: center;">
            ${new Date().getFullYear()} Monivia S.r.l. — P.IVA 10984760583 — OAM n. A23741
          </p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to: data.clientEmail,
    subject: 'Benvenuto su Monivia Banca — Le tue credenziali',
    html,
  });
}
