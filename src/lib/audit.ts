import { prisma } from './prisma';

export interface AuditInput {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: string;
  after?: string;
}

/**
 * Best-effort audit write. Never throws — a failing audit store must not
 * block the underlying operation. Uses (prisma as any) so the app boots
 * even before `prisma generate` picks up the AuditLog model.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await (prisma as any).auditLog.create({ data: input });
  } catch {
    console.error('[AUDIT] write failed');
  }
}
