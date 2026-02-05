const https = require('https');

const resetPassword = async () => {
  console.log('🔐 Resetting password for admin user...\n');
  
  const data = JSON.stringify({
    userId: '0b5e0147-8716-4333-8857-5aa4a2bc5aca',
    newPassword: 'Admin123!!'
  });

  const options = {
    hostname: '3000-07de1d35-2844-4d51-a4b2-f60e966d6b97.softgen.dev',
    port: 443,
    path: '/api/admin/reset-password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', body);
        
        if (res.statusCode === 200) {
          console.log('\n✅ Password reset successfully!');
          console.log('\n🔐 You can now login with:');
          console.log('   Email: denis.sernagiotto@outlook.it');
          console.log('   Password: Admin123!!');
          resolve(body);
        } else {
          console.error('\n❌ Failed to reset password');
          reject(new Error(body));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
};

// Execute
resetPassword()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });