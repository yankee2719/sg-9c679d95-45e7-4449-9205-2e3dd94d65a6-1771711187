const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xowadlwhemgqohmerytc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvd2FkbHdoZW1ncW9obWVyeXRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYyNjg5MSwiZXhwIjoyMDg1MjAyODkxfQ.vT9V5TWJ1kMkRfopO1CR6AhbGQIqWR_Jfw-Y6SdOUYs';

async function recreateAdminUser() {
  console.log('🚀 Recreating admin user from scratch...\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const adminEmail = 'denis.sernagiotto@outlook.it';
  const adminPassword = 'Admin123!!';

  try {
    // Step 1: Find existing user by email
    console.log('Step 1: Searching for existing user...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }

    const existingUser = users.find(u => u.email === adminEmail);

    if (existingUser) {
      console.log('⚠️  Found existing user with ID:', existingUser.id);
      console.log('    Deleting existing user...');

      // Delete the existing user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);

      if (deleteError) {
        console.error('❌ Error deleting user:', deleteError);
        return;
      }

      console.log('✅ Existing user deleted successfully');
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('ℹ️  No existing user found');
    }

    // Step 2: Create new auth user
    console.log('\nStep 2: Creating new auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Denis Sernagiotto'
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      return;
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Step 3: Wait for trigger to create profile
    console.log('\nStep 3: Waiting for profile creation trigger...');
    await new Promise(resolve => setTimeout(resolve, 800));

    // Step 4: Upsert profile with admin role
    console.log('\nStep 4: Setting admin role...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: adminEmail,
        full_name: 'Denis Sernagiotto',
        role: 'admin',
        is_active: true
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return;
    }

    console.log('✅ Profile created with admin role!\n');
    console.log('═══════════════════════════════════════');
    console.log('🎉 ADMIN USER CREATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════');
    console.log('\n📧 Email:    denis.sernagiotto@outlook.it');
    console.log('🔑 Password: Admin123!!\n');
    console.log('You can now login at: /login\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

recreateAdminUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });