const bcrypt = require('bcryptjs');

// Usage: node gen-hash.cjs "Your-Strong-Password-Here"
// The password is NEVER hardcoded — pass it as an argument.
async function main() {
  const password = process.argv[2];
  if (!password || password.length < 12) {
    console.error('Usage: node gen-hash.cjs "<strong-password-min-12-chars>"');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  const match = await bcrypt.compare(password, hash);
  console.log('Verify:', match);
  console.log();
  console.log(`UPDATE "User" SET "hashedPassword" = '${hash}' WHERE email = 'admin@monivia.it';`);
}

main();
