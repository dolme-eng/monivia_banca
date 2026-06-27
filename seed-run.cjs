require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient({});
  const email = 'admin@monivia.it';
  const pass = 'Admin@2026!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin already exists:', email);
    await prisma.$disconnect();
    return;
  }

  const hashed = await bcrypt.hash(pass, 12);
  await prisma.user.create({
    data: {
      email,
      hashedPassword: hashed,
      nome: 'Admin',
      cognome: 'Monivia',
      role: 'ADMIN',
    },
  });
  console.log('Admin created:', email);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
