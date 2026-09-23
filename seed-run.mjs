import { PrismaClient } from './node_modules/.prisma/client/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD env vars — never hardcoded.
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;

  if (!email || !pass || pass.length < 12) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars) must be set in env');
    await prisma.$disconnect();
    process.exit(1);
  }

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
