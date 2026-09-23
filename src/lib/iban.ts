/** Normalize: strip spaces/dashes, uppercase. */
export function normalizeIban(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

const IBAN_STRUCTURE = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

/**
 * ISO 13616 mod-97 validation. Returns false for malformed input —
 * never throws.
 */
export function isValidIban(input: string): boolean {
  const iban = normalizeIban(input);
  if (!IBAN_STRUCTURE.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged
    .split('')
    .map((c) => (c >= '0' && c <= '9' ? c : String(c.charCodeAt(0) - 55)))
    .join('');
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }
  return remainder === 1;
}
