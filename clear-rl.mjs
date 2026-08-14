import pg from 'pg';

const client = new pg.Client({
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
