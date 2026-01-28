const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  try {
    console.log('🔄 Resetting password for denis.sernagiotto@outlook.it...');
    
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      '6dc4cd76-c961-458d-9d63-01f403c02f87',
      { password: 'NewAdmin2026!' }
    );

    if (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }

    console.log('✅ Password reset successfully!');
    console.log('📧 Email:', data.user.email);
    console.log('🔐 New Password: NewAdmin2026!');
    console.log('\n🎯 Now you can login with:');
    console.log('   Email: denis.sernagiotto@outlook.it');
    console.log('   Password: NewAdmin2026!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

resetPassword();