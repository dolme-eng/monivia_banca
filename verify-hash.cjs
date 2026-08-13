const bcrypt = require('bcryptjs');
const password = 'Admin@2026!';

// Generate fresh hash
bcrypt.hash(password, 12).then(hash => {
  console.log('Fresh hash:', hash);
  
  // Verify it
  bcrypt.compare(password, hash).then(ok => {
    console.log('Verify fresh hash:', ok);
    
    // Now test the DB hash from screenshot
    const dbHash = '$2b$12$mq4uD46QhgTXMEhAOTMoeOdSkAAfThLdhWKTbG6itaM4WTX4sVSPW';
    console.log('DB hash:', dbHash);
    bcrypt.compare(password, dbHash).then(ok2 => {
      console.log('Verify DB hash:', ok2);
      console.log('');
      console.log('=== USE THIS HASH IN SQL ===');
      console.log(hash);
    });
  });
});
