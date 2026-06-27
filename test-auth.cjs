require('dotenv/config');
const bcrypt = require('bcryptjs');

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({});
  
  const user = await prisma.user.findUnique({ where: { email: 'admin@monivia.it' } });
  if (!user) { console.log('User not found'); return; }
  
  console.log('User found:', user.email, user.role);
  console.log('Hash:', user.hashedPassword);
  
  const match = await bcrypt.compare('Admin@2026!', user.hashedPassword);
  console.log('Password match:', match);
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
