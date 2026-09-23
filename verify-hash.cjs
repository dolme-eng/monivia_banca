const bcrypt = require('bcryptjs');

// Usage: node verify-hash.cjs "<password>" "<bcrypt-hash>"
// Verifies a password against a hash passed as arguments — nothing hardcoded.
const password = process.argv[2];
const dbHash = process.argv[3];

if (!password || !dbHash) {
  console.error('Usage: node verify-hash.cjs "<password>" "<bcrypt-hash>"');
  process.exit(1);
}

// Generate fresh hash
bcrypt.hash(password, 12).then(hash => {
  console.log('Fresh hash generated.');

  // Verify it
  bcrypt.compare(password, hash).then(ok => {
    console.log('Verify fresh hash:', ok);

    console.log('Verifying provided hash...');
    bcrypt.compare(password, dbHash).then(ok2 => {
      console.log('Verify provided hash:', ok2);
    });
  });
});
