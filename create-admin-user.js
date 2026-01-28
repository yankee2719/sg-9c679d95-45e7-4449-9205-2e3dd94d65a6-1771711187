const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verifying environment variables...');
console.log('URL:', supabaseUrl);
console.log('Service Key (first 50 chars):', supabaseServiceKey?.substring(0, 50));

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'exists' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    console.log('🚀 Starting user creation...\n');

    // Admin user details
    const email = 'denis.sernagiotto@outlook.it';
    const password = 'Admin123!@#';
    const fullName = 'Denis Sernagiotto';

    console.log('📧 Creating user:', email);

    // Create user with Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError.message);
      throw authError;
    }

    if (!authData?.user) {
      console.error('❌ No user data returned');
      throw new Error('User creation failed - no data returned');
    }

    const userId = authData.user.id;
    console.log('✅ Auth user created with ID:', userId);

    // Create profile
    console.log('📝 Creating profile...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        full_name: fullName,
        role: 'admin',
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .select();

    if (profileError) {
      console.error('❌ Error creating profile:', profileError.message);
      throw profileError;
    }

    console.log('✅ Profile created successfully!');
    console.log('\n🎉 Admin user created successfully!\n');
    console.log('📋 Login credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   Role: admin');
    console.log('   User ID:', userId);
    console.log('\n✅ You can now login at: http://localhost:3000/login\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

createAdminUser();