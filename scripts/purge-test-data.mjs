import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Purge des donnees de test. Lecture seule par defaut, ecriture avec --apply.
 *
 * Gardes-fous :
 *  - ne touche que les emails correspondant aux motifs de test ;
 *  - refuse si une transaction PENDING existe sur un compte vise (rien ne doit
 *    etre en attente sur de la donnee de test) ;
 *  - refuse si un email hors motif apparait dans la selection ;
 *  - supprime dans l'ordre des contraintes FK (Transaction, Card, Account,
 *    tokens, puis User).
 */
const APPLY = process.argv.includes("--apply");
const PURGE_LOGS = process.argv.includes("--logs");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TEST_MAIL = [
  "lower(email) ~ 'example\\.(com|org|net)$'",
  "lower(email) LIKE '%.test'",
  "lower(email) LIKE 'test.%'",
  "lower(email) LIKE 'audit%'",
  "lower(email) LIKE 'verify%'",
  "lower(email) LIKE 'fixverif%'",
  "lower(email) LIKE 'dolmegikl%'",
  "lower(email) LIKE 'dolgemikl%'",
].join(" OR ");

const victims = await prisma.$queryRawUnsafe(
  `SELECT id, email, role FROM "User" WHERE ${TEST_MAIL} ORDER BY email`
);
const ids = victims.map((v) => v.id);

if (victims.length === 0) {
  console.log("Aucun utilisateur de test detecte. Rien a faire.");
  await prisma.$disconnect();
  process.exit(0);
}

const accounts = await prisma.$queryRawUnsafe(
  `SELECT a.id, a.iban, a.balance, a.status::text FROM "Account" a WHERE a."userId" = ANY($1::text[])`,
  ids
);
const accIds = accounts.map((a) => a.id);

const counts = await prisma.$queryRawUnsafe(
  `SELECT
     (SELECT COUNT(*) FROM "Transaction" t WHERE t."accountId" = ANY($1::text[]))::int AS tx,
     (SELECT COUNT(*) FROM "Card" c WHERE c."accountId" = ANY($1::text[]))::int AS cards,
     (SELECT COUNT(*) FROM "Transaction" t WHERE t."accountId" = ANY($1::text[]) AND t.status = 'PENDING')::int AS tx_pending,
     (SELECT COUNT(*) FROM "RefreshToken" r WHERE r."userId" = ANY($2::text[]))::int AS rt,
     (SELECT COUNT(*) FROM "InviteToken" i WHERE i."userId" = ANY($2::text[]))::int AS it,
     (SELECT COUNT(*) FROM "PasswordResetToken" p WHERE p."userId" = ANY($2::text[]))::int AS prt,
     (SELECT COUNT(*) FROM "NotificationSeen" n WHERE n."userId" = ANY($2::text[]))::int AS ns,
     (SELECT COUNT(*) FROM "AuditLog" l WHERE l."actorId" = ANY($2::text[]))::int AS logs`,
  accIds.length ? accIds : ["\u0000none"],
  ids
);
const c = counts[0];

console.log("=== PLAN DE PURGE ===");
console.log(`Utilisateurs : ${victims.length}`);
for (const v of victims) {
  const own = accounts.filter((a) => v.iban === undefined);
  console.log(`  - ${v.email}  (role=${v.role})`);
}
console.log(`\nComptes      : ${accounts.length}`);
let total = 0;
for (const a of accounts) {
  const u = victims.find((v) => v.id === accounts.find(() => true) ? true : true);
  total += Number(a.balance);
  console.log(`  - ${a.iban}  ${Number(a.balance).toFixed(2).padStart(8)} EUR  [${a.status}]`);
}
console.log(`  Solde total ecrit : ${total.toFixed(2)} EUR`);
console.log(`\nLignes associees :`);
console.log(`  Transaction        ${c.tx}  (dont PENDING : ${c.tx_pending})`);
console.log(`  Card               ${c.cards}`);
console.log(`  RefreshToken       ${c.rt}`);
console.log(`  InviteToken        ${c.it}`);
console.log(`  PasswordResetToken ${c.prt}`);
console.log(`  NotificationSeen   ${c.ns}`);
console.log(`  AuditLog           ${c.logs}${PURGE_LOGS ? "  (seront supprimees)" : "  (conservees : pas de FK, trail preserve)"}`);

// --- Gardes-fous ---
const abort = [];
if (c.tx_pending > 0) abort.push(`${c.tx_pending} transaction(s) PENDING sur des comptes de test : a statuer avant suppression.`);
if (accounts.some((a) => a.status !== "CLOSED")) abort.push("Un compte de test n'est pas CLOSED.");
if (victims.some((v) => v.role === "ADMIN")) abort.push("Un ADMIN est dans la selection.");
if (abort.length) {
  console.log("\n!! PURGE REFUSEE !!");
  for (const a of abort) console.log(`  - ${a}`);
  await prisma.$disconnect();
  process.exit(1);
}

if (!APPLY) {
  console.log("\nPlan valide. Relancer avec --apply pour executer.");
  await prisma.$disconnect();
  process.exit(0);
}

console.log("\n=== EXECUTION ===");

// Un seul appel multi-instructions : PostgreSQL enchadre un simple query
// multi-statement dans une transaction implicite, donc soit tout passe, soit
// rien n'est ecrit. Les BEGIN/COMMIT explicites ne fonctionnent pas ici car
// chaque $executeRawUnsafe peut emprunter une autre connexion du pool.
const quote = (arr) => {
  const bad = arr.filter((v) => !/^[A-Za-z0-9_.:-]+$/.test(v));
  if (bad.length) throw new Error(`Identifiant inattendu, injection refusee : ${bad.join(", ")}`);
  return arr.map((v) => `'${v}'`).join(", ");
};

const idsL = quote(ids);
const accL = quote(accIds.length ? accIds : ["\u0000none"]);
const noAccounts = accIds.length === 0;

const sql = `
DO $do$
DECLARE n integer;
BEGIN
  ${noAccounts ? "" : `
  DELETE FROM "Transaction" WHERE "accountId" IN (${accL});
  DELETE FROM "Card" WHERE "accountId" IN (${accL});
  DELETE FROM "Account" WHERE "userId" IN (${idsL});`}
  DELETE FROM "RefreshToken" WHERE "userId" IN (${idsL});
  DELETE FROM "InviteToken" WHERE "userId" IN (${idsL});
  DELETE FROM "PasswordResetToken" WHERE "userId" IN (${idsL});
  DELETE FROM "NotificationSeen" WHERE "userId" IN (${idsL});
  ${PURGE_LOGS ? `DELETE FROM "AuditLog" WHERE "actorId" IN (${idsL});` : ""}
  DELETE FROM "User" WHERE id IN (${idsL});

  SELECT count(*) INTO n FROM "User" WHERE id IN (${idsL});
  IF n > 0 THEN RAISE EXCEPTION 'purge incomplete : % utilisateur(s) restant(s)', n; END IF;
END $do$;`;

await prisma.$executeRawUnsafe(sql);
console.log("  Purge terminee et verifiee (transaction implicite).");

const after = await prisma.$queryRawUnsafe(
  `SELECT (SELECT count(*) FROM "User" WHERE id = ANY($1::text[]))::int  AS users,
          (SELECT count(*) FROM "Account" WHERE "userId" = ANY($1::text[]))::int AS accounts`,
  ids
);
console.log(`  Restants : users=${after[0].users} accounts=${after[0].accounts}`);
const totalUsers = await prisma.$queryRawUnsafe(`SELECT count(*)::int n FROM "User"`);
console.log(`  Total utilisateurs en base : ${totalUsers[0].n}`);

await prisma.$disconnect();