const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Environment check...');
console.log('URL:', supabaseUrl);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function getUserIdAndCreateProfile() {
  try {
    console.log('🔍 Looking for user by email...\n');

    const email = 'denis.sernagiotto@outlook.it';

    // List all users to find the one we need
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      throw listError;
    }

    if (!users || users.users.length === 0) {
      console.error('❌ No users found in the database!');
      process.exit(1);
    }

    console.log(`✅ Found ${users.users.length} total users\n`);

    // Find our specific user
    const user = users.users.find(u => u.email === email);

    if (!user) {
      console.error(`❌ User ${email} not found!`);
      console.log('Available users:');
      users.users.forEach(u => console.log(`  - ${u.email} (${u.id})`));
      process.exit(1);
    }

    console.log('✅ User found!');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Created:', user.created_at);
    console.log('   Confirmed:', user.email_confirmed_at ? 'Yes' : 'No');

    // Check if profile exists
    console.log('\n🔍 Checking for existing profile...');
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      console.log('✅ Profile already exists!');
      console.log('   Role:', existingProfile.role);
      console.log('   Name:', existingProfile.full_name);
      console.log('\n🎉 Everything is set up correctly!');
      return;
    }

    // Create profile
    console.log('📝 Creating profile...');
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: email,
        full_name: 'Denis Sernagiotto',
        role: 'admin',
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating profile:', insertError.message);
      throw insertError;
    }

    console.log('✅ Profile created successfully!');
    console.log('\n🎉 Setup complete!\n');
    console.log('📋 You can now login at: http://localhost:3000/login');
    console.log('   Email:', email);
    console.log('   User ID:', user.id);
    console.log('   Role: admin\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

getUserIdAndCreateProfile();