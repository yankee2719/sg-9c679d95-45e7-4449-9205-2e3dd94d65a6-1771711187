// Simple script to test the create-user API endpoint
const http = require('http');

const data = JSON.stringify({
  email: 'denis.sernagiotto@outlook.it',
  password: 'Admin123!@#',
  fullName: 'Denis Sernagiotto',
  role: 'admin'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/create-user',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🚀 Creating admin user via API...\n');

const req = http.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('📋 Response Status:', res.statusCode);
    console.log('📋 Response Body:', responseData);
    
    try {
      const parsed = JSON.parse(responseData);
      if (parsed.success) {
        console.log('\n✅ USER CREATED SUCCESSFULLY!');
        console.log('   User ID:', parsed.data.userId);
        console.log('   Email:', parsed.data.email);
        console.log('   Role:', parsed.data.role);
        console.log('\n🎉 You can now login at: http://localhost:3000/login');
      } else {
        console.log('\n❌ USER CREATION FAILED');
        console.log('   Error:', parsed.error || parsed.message);
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(data);
req.end();