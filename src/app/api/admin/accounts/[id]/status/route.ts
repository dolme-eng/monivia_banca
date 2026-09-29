import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/api-auth';
import { checkOrigin } from '@/lib/origin';
import { validateCsrfToken } from '@/lib/csrf';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

/** Accounting records must survive: Italian banks keep them 10 years. */
const RETENTION_YEARS = 10;
const RETENTION_YEARS_MS = RETENTION_YEARS * 365.25 * 24 * 60 * 60 * 1000;

const statusSchema = z.object({
  action: z.enum([
    'validate',
    'freeze',
    'unfreeze',
    'block',
    'unblock',
    'close',
    'purge',
    'unlockLogin',
  ]),
  // Mandatory for `purge`: the admin must retype the IBAN, so an account can
  // never be destroyed by a mis-click or a stale confirm dialog.
  confirmIban: z.string().trim().max(64).optional(),
});

/** Refusal rendered as a 4xx and rolled back (nothing is written). */
class RefusedAction extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'RefusedAction';
    this.code = code;
    this.status = status;
  }
}

/** Removes every trace of a client (GDPR erasure). Irreversible by design. */
const purgeClient = async (tx: any, userId: string) => {
  await tx.passwordResetToken.deleteMany({ where: { userId } });
  await tx.inviteToken.deleteMany({ where: { userId } });
  await tx.refreshToken.deleteMany({ where: { userId } });
  await tx.user.delete({ where: { id: userId } });
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const rl = await checkRateLimit(`admin-account-action:${auth.session.userId}:${ip}`, 30, 10 * 60 * 1000);
  if (!rl.allowed) {
    return rateLimitedResponse(rl);
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Azione non valida' }, { status: 400 });
    }
    const { action, confirmIban } = parsed.data;

    const account = await prisma.account.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        blockedAt: true,
        userId: true,
        iban: true,
        balance: true,
      },
    });

    if (!account) {
      return NextResponse.json({ success: false, error: 'Conto non trovato' }, { status: 404 });
    }

    // Two very different operations used to share one button.
    //
    // close  — the account leaves service: status CLOSED, cards frozen,
    //          transfers blocked, every session and invite destroyed. The
    //          transaction history and the PII are RETAINED, because a bank
    //          has a legal duty to keep accounting records (10 years in Italy,
    //          D.Lgs. 231/2007 art. 222) and the client needs their statement.
    //          Reversible.
    //
    // purge  — total erasure for a data-subject request. Destroys the card
    //          numbers and every transaction, so it is only allowed on an
    //          account that can no longer hold money and whose records are old
    //          enough not to fall under the retention duty.
    if (action === 'close' || action === 'purge') {
      if (account.status === 'CLOSED' && action === 'close') {
        return NextResponse.json({ success: false, error: 'Il conto è già chiuso' }, { status: 400 });
      }

      if (action === 'purge') {
        const typed = (confirmIban || '').replace(/\s+/g, '').toUpperCase();
        if (!typed || typed !== account.iban.replace(/\s+/g, '').toUpperCase()) {
          throw new RefusedAction(
            'Digita l\'IBAN del conto per confermare l\'eliminazione definitiva.',
            'IBAN_CONFIRM_MISMATCH',
            400
          );
        }
        const balance = Number(account.balance);
        if (balance !== 0) {
          throw new RefusedAction(
            `Impossibile eliminare: il conto ha un saldo di ${balance.toFixed(2)} €. ` +
              'Chiudi il conto e trasferisci i fondi prima.',
            'BALANCE_NOT_ZERO',
            400
          );
        }
        const recent = await prisma.transaction.findFirst({
          where: { accountId: id, createdAt: { gte: new Date(Date.now() - RETENTION_YEARS_MS) } },
          select: { id: true },
        });
        if (recent) {
          throw new RefusedAction(
            `Impossibile eliminare: ci sono movimenti degli ultimi ${RETENTION_YEARS} anni, ` +
              'soggetti all\'obbligo di conservazione.',
            'UNDER_RETENTION',
            400
          );
        }
      }

      const summary = await prisma.$transaction(async (tx) => {
        const counts = await Promise.all([
          tx.card.count({ where: { accountId: id } }),
          tx.transaction.count({ where: { accountId: id } }),
        ]);

        // Written inside the transaction: a destructive action and its record
        // now either both happen or neither does. Previously the audit row was
        // written after the commit, so a crash in between left no trace at all.
        // The context is packed into `after` because AuditLog has no structured
        // column yet (adding one is part of the migrations reconciliation).
        await tx.auditLog.create({
          data: {
            actorId: auth.session.userId!,
            action: action === 'purge' ? 'ACCOUNT_PURGE' : 'ACCOUNT_CLOSE',
            entity: 'Account',
            entityId: id,
            before: `${account.status} iban=${account.iban} balance=${Number(account.balance).toFixed(2)}`,
            after: `${action === 'purge' ? 'ERASED' : 'CLOSED'} cards=${counts[0]} transactions=${counts[1]}`,
          },
        });

        if (action === 'purge') {
          await tx.card.deleteMany({ where: { accountId: id } });
          await tx.transaction.deleteMany({ where: { accountId: id } });
          await tx.account.delete({ where: { id } });
          await purgeClient(tx, account.userId);
          return { cards: counts[0], transactions: counts[1] };
        }

        // close: stop every route to the money and every session.
        await tx.card.updateMany({ where: { accountId: id }, data: { status: 'FROZEN' } });
        await tx.transaction.updateMany({
          where: { accountId: id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
        await tx.refreshToken.deleteMany({ where: { userId: account.userId } });
        await tx.inviteToken.deleteMany({ where: { userId: account.userId, usedAt: null } });
        await tx.passwordResetToken.deleteMany({ where: { userId: account.userId, usedAt: null } });
        await tx.account.update({
          where: { id },
          data: { status: 'CLOSED', blockedAt: new Date() },
        });
        return { cards: counts[0], transactions: counts[1] };
      });

      if (action === 'purge') {
        return NextResponse.json({
          success: true,
          message: 'Conto e dati del cliente eliminati definitivamente',
          purged: summary,
        });
      }
      return NextResponse.json({
        success: true,
        message: 'Conto chiuso. Movimenti e dati anagrafici conservati per gli obblighi di legge.',
        account: { id, status: 'CLOSED' },
      });
    }

    let updateData: Record<string, unknown> = {};

    // Clears the login lockout (failedAttempts / lockedUntil) on the owner.
    // Separate from Account.status: this is an auth-level lock, not a funds lock.
    if (action === 'unlockLogin') {
      const cleared = await prisma.user.update({
        where: { id: account.userId },
        data: { failedAttempts: 0, lockedUntil: null },
        select: { id: true },
      });
      await logAudit({
        actorId: auth.session.userId!,
        action: 'USER_UNLOCK_LOGIN',
        entity: 'User',
        entityId: cleared.id,
        before: 'LOCKED',
        after: 'UNLOCKED',
      });
      return NextResponse.json({ success: true, message: 'Accesso sbloccato' });
    }

    switch (action) {
      case 'validate':
        if (account.status !== 'PENDING') {
          return NextResponse.json({ success: false, error: 'Il conto non è in attesa di validazione' }, { status: 400 });
        }
        updateData = { status: 'ACTIVE' };
        break;
      case 'freeze':
        if (account.status === 'FROZEN') {
          return NextResponse.json({ success: false, error: 'Il conto è già congelato' }, { status: 400 });
        }
        updateData = { status: 'FROZEN' };
        break;
      case 'unfreeze':
        if (account.status !== 'FROZEN') {
          return NextResponse.json({ success: false, error: 'Il conto non è congelato' }, { status: 400 });
        }
        updateData = { status: 'ACTIVE' };
        break;
      case 'block':
        if (account.blockedAt) {
          return NextResponse.json({ success: false, error: 'I trasferimenti sono già bloccati' }, { status: 400 });
        }
        updateData = { blockedAt: new Date() };
        break;
      case 'unblock':
        if (!account.blockedAt) {
          return NextResponse.json({ success: false, error: 'I trasferimenti non sono bloccati' }, { status: 400 });
        }
        updateData = { blockedAt: null };
        break;
    }

    const updated = await prisma.account.update({
      where: { id },
      data: updateData,
      select: { id: true, status: true, blockedAt: true },
    });

    // The invite served its purpose once the account is validated: consume it
    // so the link cannot be reused afterwards (24h expiry still applies before).
    if (action === 'validate') {
      await prisma.inviteToken
        .updateMany({
          where: { userId: account.userId, usedAt: null },
          data: { usedAt: new Date() },
        })
        .catch(() => {});
    }

    await logAudit({
      actorId: auth.session.userId!,
      action: `ACCOUNT_${action.toUpperCase()}`,
      entity: 'Account',
      entityId: id,
      before: account.status,
      after: `${updated.status} iban=${account.iban}`,
    });

    return NextResponse.json({ success: true, account: updated });
  } catch (error) {
    if (error instanceof RefusedAction) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error('Admin account action error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante l\'operazione' }, { status: 500 });
  }
}
