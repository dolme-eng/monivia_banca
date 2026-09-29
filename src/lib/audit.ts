import { prisma } from './prisma';

export interface AuditInput {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: string;
  /** Context is packed into this free-text column (e.g. `balance=750.00 iban=…`). */
  after?: string;
}

// One flag per process: if the very first audit write fails (missing model, DB
// down), every later write would fail identically and the console would fill
// with identical lines nobody reads. Warn loudly, once.
let auditStoreBroken = false;

/**
 * Best-effort audit write: a failing audit store must never roll back or break
 * the business operation it documents.
 *
 * It is NOT silent though — a money movement that leaves no trace is worse than
 * a failed request, so a broken store reports itself loudly on first use.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const delegate = (prisma as unknown as { auditLog?: { create: (a: { data: AuditInput }) => Promise<unknown> } })
      .auditLog;
    if (!delegate?.create) {
      if (!auditStoreBroken) {
        auditStoreBroken = true;
        console.error(
          '[AUDIT] AuditLog model unavailable — run `prisma generate` and apply the ' +
            'add_pan_enc_and_audit_log migration. Sensitive operations are NOT being recorded.'
        );
      }
      return;
    }
    await delegate.create({ data: input });
  } catch (err) {
    if (!auditStoreBroken) {
      auditStoreBroken = true;
      console.error('[AUDIT] audit store unavailable — sensitive operations are not being recorded', err);
    }
  }
}

/** Exposed for the admin health panel. */
export function isAuditStoreHealthy(): boolean {
  return !auditStoreBroken;
}
