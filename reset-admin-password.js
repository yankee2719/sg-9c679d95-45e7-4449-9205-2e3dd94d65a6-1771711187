const https = require('https');

const createAdminUser = async () => {
  // Prima elimino il profilo esistente (senza auth)
  console.log('🗑️  Cleaning up existing profile without auth...\n');
  
  const data = JSON.stringify({
    email: 'denis.sernagiotto@outlook.it',
    password: 'Admin123!!',
    fullName: 'Denis Sernagiotto',
    role: 'admin',
    phone: null
  });

  const options = {
    hostname: '3000-07de1d35-2844-4d51-a4b2-f60e966d6b97.softgen.dev',
    port: 443,
    path: '/api/admin/create-user',
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
        
        if (res.statusCode === 201) {
          console.log('\n✅ Admin user created successfully!');
          console.log('\n🔐 You can now login with:');
          console.log('   Email: denis.sernagiotto@outlook.it');
          console.log('   Password: Admin123!!');
          resolve(body);
        } else {
          console.error('\n❌ Failed to create admin user');
          console.error('This might be because the user already exists in auth.users');
          console.error('Try deleting the user from Supabase Dashboard → Authentication → Users');
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
console.log('🚀 Creating admin user...\n');
createAdminUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });