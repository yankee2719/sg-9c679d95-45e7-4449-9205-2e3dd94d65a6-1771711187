const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xowadlwhemgqohmerytc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvd2FkbHdoZW1ncW9obWVyeXRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYyNjg5MSwiZXhwIjoyMDg1MjAyODkxfQ.vT9V5TWJ1kMkRfopO1CR6AhbGQIqWR_Jfw-Y6SdOUYs';

async function createAdminUser() {
  console.log('🚀 Creating new admin user...\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const adminEmail = 'denis.sernagiotto@outlook.it';
  const adminPassword = 'Admin123!!';

  try {
    // Step 1: Create user in auth.users
    console.log('Step 1: Creating auth user...');
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

    // Step 2: Wait for trigger to create profile
    console.log('\nStep 2: Waiting for profile creation...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: Update profile with admin role
    console.log('\nStep 3: Setting admin role...');
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

createAdminUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });