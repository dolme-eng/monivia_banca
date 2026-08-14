const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://postgres.cebeiqnvggwycmerrzus:Monivia24%40Banca@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await c.connect();
  try {
    await c.query('ALTER TABLE "Account" ADD CONSTRAINT IF NOT EXISTS account_balance_non_negative CHECK (balance >= 0)');
    console.log('OK: CHECK constraint on Account.balance');
  } catch (e) {
    console.log('CHECK constraint:', e.message);
  }
  try {
    await c.query('ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP');
    console.log('OK: RefreshToken.updatedAt');
  } catch (e) {
    console.log('RefreshToken.updatedAt:', e.message);
  }
  try {
    await c.query('ALTER TABLE "InviteToken" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP');
    console.log('OK: InviteToken.updatedAt');
  } catch (e) {
    console.log('InviteToken.updatedAt:', e.message);
  }
  try {
    await c.query('ALTER TABLE "PasswordResetToken" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP');
    console.log('OK: PasswordResetToken.updatedAt');
  } catch (e) {
    console.log('PasswordResetToken.updatedAt:', e.message);
  }
  await c.end();
}

run().catch(e => { console.error(e); process.exit(1); });
