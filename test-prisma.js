const { PrismaClient } = require('.prisma/client');
const p = new PrismaClient({});
p.user.findMany().then(r => console.log('OK:', r.length)).catch(e => console.error('ERR:', e.message)).finally(() => p.$disconnect());
