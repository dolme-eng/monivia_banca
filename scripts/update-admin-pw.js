const bcrypt = require(require('path').join(__dirname, '..', 'node_modules', 'bcryptjs'));
const { Client } = require(require('path').join(__dirname, '..', 'node_modules', 'pg'));

const NEW_PASSWORD = 'fEhby4YBaACjmDtF7DcSwJxQ-3r5gVPD';

async function run() {
  const hash = await bcrypt.hash(NEW_PASSWORD, 12);
  console.log('New hash:', hash);
  
  const c = new Client({
    connectionString: 'postgresql://postgres.cebeiqnvggwycmerrzus:Monivia24%40Banca@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  
  const res = await c.query(
    'UPDATE "User" SET "hashedPassword" = $1 WHERE email = $2 RETURNING id, email',
    [hash, 'admin@monivia.it']
  );
  console.log('Updated:', res.rows);
  await c.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
