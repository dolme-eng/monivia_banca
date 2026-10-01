import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock nodemailer before importing
const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'mock-id' });
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}));

// Set SMTP env vars so the functions don't skip
process.env.SMTP_USER = 'test@monivia.it';
process.env.SMTP_PASS = 'test-pass';
process.env.ADMIN_EMAIL = 'admin@monivia.it';

const {
  sendAdminPrelievoNotification,
  sendClientTransactionUpdate,
  refreshEmailConfig,
  isEmailConfigured,
} = await import('./email-notify');

/**
 * Restores the configured provider between tests.
 *
 * The old version deleted process.env.SMTP_USER after import, which cannot work:
 * the module read the environment at load time, so the transporter was already
 * built and the mail still went out. Configuration is now re-readable through
 * refreshEmailConfig(), which is also what makes a corrected env take effect
 * without a redeploy.
 */
function withSmtp() {
  process.env.SMTP_USER = 'test@monivia.it';
  process.env.SMTP_PASS = 'test-pass';
  refreshEmailConfig();
}

function withoutSmtp() {
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  refreshEmailConfig();
}

describe('sendAdminPrelievoNotification', () => {
  beforeEach(() => {
    mockSendMail.mockClear();
    withSmtp();
  });

  it('sends email to admin with correct subject', async () => {
    await sendAdminPrelievoNotification({
      clientNome: 'Mario',
      clientCognome: 'Rossi',
      clientEmail: 'mario@test.it',
      amount: 1500,
      iban: 'IT00ABC123',
      description: 'Prelievo contanti',
      transactionId: 'tx-123',
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe('admin@monivia.it');
    // The subject carries the client name; the amount lives in the body, and
    // Italian formatting renders 1500 as "1.500,00". The old assertions looked
    // for "1500,00" in the subject and never matched.
    expect(call.subject).toContain('Mario Rossi');
    // Amount lives in the body. Asserted loosely on the integer part because
    // thousands grouping depends on the ICU data available to the runtime:
    // Node with full-icu renders "1.500,00", a slim build renders "1500,00".
    // Pinning the separator made the suite environment-dependent.
    expect(call.html).toMatch(/1\.?500,00/);
  });

  it('includes client name and IBAN in email body', async () => {
    await sendAdminPrelievoNotification({
      clientNome: 'Luigi',
      clientCognome: 'Verdi',
      clientEmail: 'luigi@test.it',
      amount: 500,
      iban: 'IT00XYZ789',
      description: 'Prelievo ATM',
      transactionId: 'tx-456',
    });

    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).toContain('Luigi Verdi');
    expect(call.html).toContain('IT00XYZ789');
    expect(call.html).toContain('500,00');
  });

  it('sanitizes HTML in client name to prevent XSS', async () => {
    await sendAdminPrelievoNotification({
      clientNome: '<script>alert("xss")</script>',
      clientCognome: 'Test',
      clientEmail: 'xss@test.it',
      amount: 100,
      iban: 'IT00XSS',
      description: 'Descrizione',
      transactionId: 'tx-xss',
    });

    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).not.toContain('<script>');
    expect(call.html).toContain('&lt;script&gt;');
  });

  it('skips sending when SMTP credentials are missing', async () => {
    withoutSmtp();
    expect(isEmailConfigured()).toBe(false);

    await sendAdminPrelievoNotification({
      clientNome: 'Test',
      clientCognome: 'User',
      clientEmail: 'test@test.it',
      amount: 100,
      iban: 'IT00TEST',
      description: 'Test',
      transactionId: 'tx-test',
    });

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  // The behaviour the old test could not reach: credentials fixed after the
  // module was imported are now picked up without waiting for a redeploy.
  it('picks up credentials corrected after startup', async () => {
    withoutSmtp();
    expect(isEmailConfigured()).toBe(false);

    withSmtp();
    expect(isEmailConfigured()).toBe(true);

    await sendAdminPrelievoNotification({
      clientNome: 'Recovery',
      clientCognome: 'Test',
      clientEmail: 'recovery@test.it',
      amount: 10,
      iban: 'IT00REC',
      description: 'Dopo refresh',
      transactionId: 'tx-recovery',
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});

describe('sendClientTransactionUpdate', () => {
  beforeEach(() => {
    mockSendMail.mockClear();
    withSmtp();
  });

  it('sends approved email with correct status', async () => {
    await sendClientTransactionUpdate({
      clientEmail: 'client@test.it',
      clientNome: 'Anna',
      type: 'APPROVED',
      transactionType: 'Prelievo',
      amount: 2000,
      description: 'Prelievo approvato',
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe('client@test.it');
    expect(call.subject).toContain('Approvata');
    // See the note above: ICU presence decides whether the thousands separator
    // appears, so match either rendering.
    expect(call.html).toMatch(/2\.?000,00/);
  });

  it('sends rejected email with correct status', async () => {
    await sendClientTransactionUpdate({
      clientEmail: 'client@test.it',
      clientNome: 'Anna',
      type: 'REJECTED',
      transactionType: 'Trasferimento',
      amount: 500,
      description: 'Virement refusé',
    });

    const call = mockSendMail.mock.calls[0][0];
    expect(call.subject).toContain('Rifiutata');
  });

  it('sanitizes transaction type in HTML', async () => {
    await sendClientTransactionUpdate({
      clientEmail: 'test@test.it',
      clientNome: 'Test',
      type: 'APPROVED',
      transactionType: '<img src=x onerror=alert(1)>',
      amount: 100,
      description: 'Test',
    });

    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).not.toContain('<img');
    expect(call.html).toContain('&lt;img');
  });

  it('skips sending when SMTP credentials are missing', async () => {
    withoutSmtp();
    expect(isEmailConfigured()).toBe(false);

    await sendClientTransactionUpdate({
      clientEmail: 'test@test.it',
      clientNome: 'Test',
      type: 'APPROVED',
      transactionType: 'Prelievo',
      amount: 100,
      description: 'Test',
    });

    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
