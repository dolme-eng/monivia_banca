const bcrypt = require('bcryptjs');

async function main() {
  const hash = await bcrypt.hash('Admin@2026!', 12);
  const match = await bcrypt.compare('Admin@2026!', hash);
  console.log('Hash:', hash);
  console.log('Verify:', match);
  console.log();
  console.log(`UPDATE "User" SET "hashedPassword" = '${hash}' WHERE email = 'admin@monivia.it';`);
}

main();
