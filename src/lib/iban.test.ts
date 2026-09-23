import { describe, it, expect } from 'vitest';
import { isValidIban, normalizeIban } from './iban';

describe('normalizeIban', () => {
  it('strips spaces and dashes and uppercases', () => {
    expect(normalizeIban('it60 x0542-811101000000123456')).toBe('IT60X0542811101000000123456');
  });
});

describe('isValidIban', () => {
  it('accepts the official Italian test IBAN', () => {
    expect(isValidIban('IT60X0542811101000000123456')).toBe(true);
  });

  it('accepts lowercase / spaced input', () => {
    expect(isValidIban('it60 x0542 8111 0100 0000 123456')).toBe(true);
  });

  it('rejects bad check digits', () => {
    expect(isValidIban('IT61X0542811101000000123456')).toBe(false);
  });

  it('rejects malformed input without throwing', () => {
    expect(isValidIban('')).toBe(false);
    expect(isValidIban('NOTANIBAN')).toBe(false);
    expect(isValidIban('IT12')).toBe(false);
    expect(isValidIban('12X0542811101000000123456')).toBe(false);
  });

  it('accepts another country (DE) when mod-97 passes', () => {
    expect(isValidIban('DE89370400440532013000')).toBe(true);
    expect(isValidIban('DE00370400440532013000')).toBe(false);
  });
});
