/**
 * Setup script to create the first admin user
 * This uses the Supabase Service Role Key to bypass RLS
 */

const http = require('http');
const fs = require('fs');

// Read .env.local file
const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');

let supabaseUrl, serviceRoleKey;

lines.forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    serviceRoleKey = line.split('=')[1].trim();
  }
});

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('🔧 Creating admin user...');
console.log('📍 Supabase URL:', supabaseUrl);

const adminData = {
  email: 'admin@maintenance.com',
  password: 'Admin123!',
  fullName: 'System Administrator',
  role: 'admin'
};

const postData = JSON.stringify(adminData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/create-user',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    
    if (res.statusCode === 201) {
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@maintenance.com');
      console.log('🔑 Password: Admin123!');
      console.log('\n👉 Go to /login and sign in with these credentials');
    } else {
      console.error('❌ Failed to create admin user');
      console.error('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
  console.log('\n⚠️  Make sure the Next.js server is running (npm run dev)');
});

req.write(postData);
req.end();