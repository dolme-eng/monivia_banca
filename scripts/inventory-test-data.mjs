import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Inventaire en lecture seule des donnees de test.
 * N'ecrit rien : sert a valider avec l'utilisateur ce qui sera supprime.
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TEST_MAIL = '(lower(u.email) ~ \'example\\.(com|org|net)$\'' +
  ' OR lower(u.email) LIKE \'%\\.test\'' +
  ' OR lower(u.email) LIKE \'test.%\'' +
  ' OR lower(u.email) LIKE \'audit%\' ' +
  ' OR lower(u.email) LIKE \'verify%\' ' +
  ' OR lower(u.email) LIKE \'fixverif%\' ' +
  ' OR lower(u.email) LIKE \'dolmegikl%\'' +
  ' OR lower(u.email) LIKE \'dolgemikl%\')';

// NB : le solde est calcule dans une sous-requête. Un SUM() dans le SELECT
// principal serait multiplie par le fan-out des jointures Card/Transaction.
const users = await prisma.$queryRawUnsafe(`
  SELECT u.id, u.email, u.role, u.nome,
         COALESCE((SELECT SUM(a.balance) FROM "Account" a WHERE a."userId" = u.id), 0)::bigint AS balance,
         (SELECT COUNT(*) FROM "Account" a WHERE a."userId" = u.id)                  AS accounts,
         (SELECT COUNT(*) FROM "Card" c JOIN "Account" a ON a.id = c."accountId" WHERE a."userId" = u.id) AS cards,
         (SELECT COUNT(*) FROM "Transaction" t JOIN "Account" a ON a.id = t."accountId" WHERE a."userId" = u.id) AS tx,
         (SELECT string_agg(a.status::text, ',') FROM "Account" a WHERE a."userId" = u.id) AS astatus,
         (${TEST_MAIL})                        AS is_test
  FROM "User" u
  ORDER BY u."createdAt"
`);

console.log(`Total utilisateurs : ${users.length}\n`);
for (const u of users) {
  console.log(
    `${u.is_test ? "TEST " : "REAL "} ${String(u.email).padEnd(34)} ${String(u.role).padEnd(6)} ` +
    `comptes=${u.accounts} cartes=${u.cards} tx=${String(u.tx).padStart(4)} ` +
    `solde=${Number(u.balance).toFixed(2).padStart(12)} EUR  [${u.astatus ?? "-"}]`
  );
}
const t = users.filter((u) => u.is_test).length;
console.log(`\n${t} utilisateur(s) test(s), ${users.length - t} reel(s).`);

const accts = await prisma.$queryRawUnsafe(`
  SELECT a.id, a.iban, a.balance, a.status, u.email,
         (${TEST_MAIL}) AS is_test
  FROM "Account" a JOIN "User" u ON u.id = a."userId"
  ORDER BY (${TEST_MAIL}), u.email
`);
console.log("\n=== Comptes ===");
for (const a of accts) {
  console.log(`  ${a.is_test ? "TEST" : "REAL"}  ${String(a.iban).padEnd(34)} ${Number(a.balance).toFixed(2).padStart(12)} EUR  ${String(a.status).padEnd(8)} ${a.email}`);
}

const pending = await prisma.$queryRawUnsafe(`
  SELECT t.id, t.type, t.amount, t.description, t.status, u.email
  FROM "Transaction" t
  JOIN "Account" a ON a.id = t."accountId"
  JOIN "User" u ON u.id = a."userId"
  WHERE t.status = 'PENDING'
  ORDER BY t."createdAt"
`);
console.log(`\n=== Transactions PENDING (${pending.length}) — NE PAS TOUCHER ===`);
for (const p of pending) {
  console.log(`  ${p.id}  ${String(p.type).padEnd(14)} ${Number(p.amount).toFixed(2).padStart(10)}  ${p.email}  "${p.description}"`);
}

await prisma.$disconnect();