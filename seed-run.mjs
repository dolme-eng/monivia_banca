import { PrismaClient } from './node_modules/.prisma/client/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
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
