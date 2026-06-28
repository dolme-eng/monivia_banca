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

const { sendAdminPrelievoNotification, sendClientTransactionUpdate } = await import('./email-notify');

describe('sendAdminPrelievoNotification', () => {
  beforeEach(() => {
    mockSendMail.mockClear();
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
    expect(call.subject).toContain('1500,00');
    expect(call.subject).toContain('Mario Rossi');
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
    const originalUser = process.env.SMTP_USER;
    const originalPass = process.env.SMTP_PASS;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

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
    process.env.SMTP_USER = originalUser;
    process.env.SMTP_PASS = originalPass;
  });
});

describe('sendClientTransactionUpdate', () => {
  beforeEach(() => {
    mockSendMail.mockClear();
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
    expect(call.subject).toContain('2000,00');
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
    const originalUser = process.env.SMTP_USER;
    const originalPass = process.env.SMTP_PASS;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    await sendClientTransactionUpdate({
      clientEmail: 'test@test.it',
      clientNome: 'Test',
      type: 'APPROVED',
      transactionType: 'Prelievo',
      amount: 100,
      description: 'Test',
    });

    expect(mockSendMail).not.toHaveBeenCalled();
    process.env.SMTP_USER = originalUser;
    process.env.SMTP_PASS = originalPass;
  });
});
