import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendAdminPrelievoNotification(data: {
  clientNome: string;
  clientCognome: string;
  clientEmail: string;
  amount: number;
  iban: string;
  description: string;
  transactionId: string;
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[EMAIL-MOCK] Admin prelievo notification skipped — no SMTP credentials');
    return;
  }

  const amountStr = data.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 });
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
              ⚠ Un client ha richiesto un prelievo in attesa di approvazione.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">
                Cliente
              </td>
              <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #0a1628; border-bottom: 1px solid #f1f5f9; text-align: right;">
                ${escapeHtml(data.clientNome)} ${escapeHtml(data.clientCognome)}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">
                Email
              </td>
              <td style="padding: 10px 0; font-size: 14px; color: #0a1628; border-bottom: 1px solid #f1f5f9; text-align: right;">
                ${escapeHtml(data.clientEmail)}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">
                Importo
              </td>
              <td style="padding: 10px 0; font-size: 18px; font-weight: 900; color: #0a1628; border-bottom: 1px solid #f1f5f9; text-align: right;">
                € ${amountStr}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">
                IBAN
              </td>
              <td style="padding: 10px 0; font-size: 12px; color: #0a1628; border-bottom: 1px solid #f1f5f9; text-align: right; font-family: monospace;">
                ${escapeHtml(data.iban)}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">
                Descrizione
              </td>
              <td style="padding: 10px 0; font-size: 14px; color: #0a1628; text-align: right;">
                ${escapeHtml(data.description)}
              </td>
            </tr>
          </table>

          <a href="${adminUrl}" style="display: block; width: 100%; padding: 14px 0; background: #00d4ff; color: #0a1628; font-size: 14px; font-weight: 900; text-align: center; text-decoration: none; border-radius: 12px;">
            Rivedi e Approva →
          </a>

          <p style="margin: 16px 0 0; font-size: 11px; color: #94a3b8; text-align: center;">
            Oppure apri il pannello amministrativo per gestire questa richiesta.
          </p>
        </div>

        <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 10px; color: #94a3b8; text-align: center;">
            © ${new Date().getFullYear()} Monivia S.r.l. — P.IVA 10984760583 — OAM n. A23741
          </p>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: '"Monivia Banca" <banca@monivia.it>',
    to: process.env.ADMIN_EMAIL || 'admin@monivia.it',
    subject: `⚠ Prelievo in attesa — €${amountStr} — ${data.clientNome} ${data.clientCognome}`,
    html,
  });
}

export async function sendClientTransactionUpdate(data: {
  clientEmail: string;
  clientNome: string;
  type: 'APPROVED' | 'REJECTED';
  transactionType: string;
  amount: number;
  description: string;
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[EMAIL-MOCK] Client transaction update skipped — no SMTP credentials');
    return;
  }

  const amountStr = Math.abs(Number(data.amount)).toLocaleString('it-IT', { minimumFractionDigits: 2 });
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
              <span style="font-size: 32px;">${isApproved ? '✓' : '✕'}</span>
            </div>
            <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 900; color: #0a1628;">
              Transazione ${statusText}
            </h2>
            <p style="margin: 0; font-size: 14px; color: #64748b;">
              La tua richiesta di ${escapeHtml(data.transactionType.toLowerCase())} è stata ${statusText.toLowerCase()} dall'amministrazione.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">
                Tipo
              </td>
              <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #0a1628; border-bottom: 1px solid #f1f5f9; text-align: right;">
                ${escapeHtml(data.transactionType)}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">
                Importo
              </td>
              <td style="padding: 10px 0; font-size: 18px; font-weight: 900; color: ${statusColor}; border-bottom: 1px solid #f1f5f9; text-align: right;">
                € ${amountStr}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">
                Descrizione
              </td>
              <td style="padding: 10px 0; font-size: 14px; color: #0a1628; text-align: right;">
                ${escapeHtml(data.description)}
              </td>
            </tr>
          </table>

          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard" style="display: block; width: 100%; padding: 14px 0; background: #0a1628; color: #ffffff; font-size: 14px; font-weight: 900; text-align: center; text-decoration: none; border-radius: 12px;">
            Vai alla Dashboard →
          </a>
        </div>

        <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 10px; color: #94a3b8; text-align: center;">
            © ${new Date().getFullYear()} Monivia S.r.l. — P.IVA 10984760583 — OAM n. A23741
          </p>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: '"Monivia Banca" <banca@monivia.it>',
    to: data.clientEmail,
    subject: `Monivia Banca — Transazione ${statusText}: €${amountStr}`,
    html,
  });
}
