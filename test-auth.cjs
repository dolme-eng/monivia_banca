require('dotenv/config');
const bcrypt = require('bcryptjs');

// Usage: node test-auth.cjs "password-to-test"
// Compares the given password against the admin's stored hash.
// Never prints the stored hash.
async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error('Usage: node test-auth.cjs "<password-to-test>"');
    process.exit(1);
  }
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({});

  const user = await prisma.user.findUnique({ where: { email: 'admin@monivia.it' } });
  if (!user) { console.log('User not found'); return; }

  console.log('User found:', user.email, user.role);

  const match = await bcrypt.compare(password, user.hashedPassword);
  console.log('Password match:', match);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
