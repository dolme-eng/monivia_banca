const { Client } = require('E:/web_app/projrt/Monivia/monivia_banque/node_modules/@prisma/adapter-pg/node_modules/pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  const r = await client.query('DELETE FROM "RateLimitEntry"');
  console.log(`Deleted ${r.rowCount} rate limit entries`);

  const u = await client.query(
    `UPDATE "User" SET "failedAttempts" = 0, "lockedUntil" = NULL WHERE email = 'admin@monivia.it'`
  );
  console.log(`Unlocked admin: ${u.rowCount} row(s)`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
