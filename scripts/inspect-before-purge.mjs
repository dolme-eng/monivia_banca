import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// 1. Que sont devenues les transactions de calo69termini ?
const calo = await prisma.$queryRawUnsafe(`
  SELECT t.id, t.type::text, t.amount, t.status::text, t.description, t."createdAt"
  FROM "Transaction" t JOIN "Account" a ON a.id = t."accountId"
  JOIN "User" u ON u.id = a."userId"
  WHERE u.email = 'calo69termini@gmail.com'
  ORDER BY t."createdAt" DESC
`);
console.log("=== Transactions calo69termini@gmail.com (la 7500 est-elle toujours en attente ?) ===");
for (const t of calo) {
  console.log(`  ${String(t.status).padEnd(9)} ${String(t.type).padEnd(14)} ${(Number(t.amount) / 100).toFixed(2).padStart(10)}  ${t.description}`);
}

const stillPending = await prisma.$queryRawUnsafe(`
  SELECT COUNT(*)::int AS n FROM "Transaction" WHERE status = 'PENDING'
`);
console.log(`\n>>> Transactions PENDING sur toute la base : ${stillPending[0].n}`);

// 2. Journaux d'audit rattachés aux utilisateurs de test
const emails = [
  "dolmegikl@gmail.com", "test.provision@example.com", "audit.e2e.2026@example.com",
  "audit.p1.2026@example.com", "audit.p2.2026@example.com", "audit.final.2026@example.com",
  "dolgemikl@gmail.com", "AuditTrail.Test@GMAIL.com", "AuditCase.Test@GMAIL.com",
  "fixverif.sub@gmail.com", "verify.pwd.1@example.com",
];
const logs = await prisma.$queryRawUnsafe(`
  SELECT l.action, l.entity, l."entityId", u.email AS actor, l."createdAt"
  FROM "AuditLog" l JOIN "User" u ON u.id = l."actorId"
  WHERE lower(u.email) = ANY($1::text[])
  ORDER BY l."createdAt" DESC LIMIT 25
`, emails);
console.log(`\n=== AuditLog ou le acteur est un utilisateur de test : ${logs.length} ligne(s) (25 max) ===`);
for (const l of logs) console.log(`  ${String(l.action).padEnd(22)} ${String(l.entity).padEnd(10)} ${String(l.actor).padEnd(30)} ${l.createdAt}`);

const orphanLogs = await prisma.$queryRawUnsafe(`
  SELECT COUNT(*)::int AS n FROM "AuditLog" l
  LEFT JOIN "User" u ON u.id = l."actorId" WHERE u.id IS NULL
`);
console.log(`\nAuditLog dont l'acteur n'existe plus : ${orphanLogs[0].n}`);

const totalLogs = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "AuditLog"`);
console.log(`Total AuditLog : ${totalLogs[0].n}`);

await prisma.$disconnect();