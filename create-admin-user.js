const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  const email = 'denis.sernagiotto@outlook.it';
  const password = 'Admin123!@#';
  const userId = '2ac92578-8a1c-4d29-b1e9-f3fbb11cb881'; // Use existing profile ID

  try {
    console.log('\n🔍 Checking if user already exists...');
    
    // Check if user exists in auth.users
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      throw listError;
    }

    const existingUser = existingUsers.users.find(u => u.email === email);

    if (existingUser) {
      console.log('⚠️  User already exists with ID:', existingUser.id);
      console.log('   Email:', existingUser.email);
      console.log('   Email confirmed:', existingUser.email_confirmed_at ? '✅' : '❌');
      
      // Update the existing profile to use this user's ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ id: existingUser.id })
        .eq('email', email);
      
      if (updateError) {
        console.error('❌ Error updating profile ID:', updateError);
      } else {
        console.log('✅ Profile updated with correct user ID');
      }
      
      return;
    }

    console.log('\n📝 Creating new admin user...');
    console.log('   Email:', email);
    console.log('   Using ID from existing profile:', userId);

    // Create user with specific ID matching the profile
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Denis Sernagiotto',
        role: 'admin'
      }
    });

    if (createError) {
      console.error('❌ Error creating user:', createError);
      throw createError;
    }

    console.log('\n✅ User created successfully!');
    console.log('   User ID:', newUser.user.id);
    console.log('   Email:', newUser.user.email);
    console.log('   Email confirmed:', newUser.user.email_confirmed_at ? '✅' : '❌');

    // Update profile to use the new user's ID
    console.log('\n📝 Updating profile with new user ID...');
    
    // First, delete the old profile with wrong ID
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('email', email);
    
    if (deleteError) {
      console.error('⚠️  Error deleting old profile:', deleteError);
    }

    // Create new profile with correct ID
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email: email,
        full_name: 'Denis Sernagiotto',
        role: 'admin',
        is_active: true,
        two_factor_enabled: false
      });

    if (insertError) {
      console.error('❌ Error creating profile:', insertError);
      throw insertError;
    }

    console.log('✅ Profile created successfully!');

    console.log('\n🎉 SETUP COMPLETE!');
    console.log('\n📋 Login Credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   Role: Administrator');
    console.log('\n🚀 You can now login at /login\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

createAdminUser();