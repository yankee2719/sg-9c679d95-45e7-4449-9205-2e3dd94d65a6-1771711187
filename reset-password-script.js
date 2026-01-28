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
    
    // First, get the user ID from the database
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      process.exit(1);
    }

    const user = users.users.find(u => u.email === 'denis.sernagiotto@outlook.it');
    
    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    console.log('✅ User found:', user.id);

    // Reset password using updateUserById
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: 'Admin2026!' }
    );

    if (error) {
      console.error('❌ Password reset error:', error.message);
      process.exit(1);
    }

    console.log('✅ Password reset successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 USER ID:', user.id);
    console.log('📧 EMAIL: denis.sernagiotto@outlook.it');
    console.log('🔐 NEW PASSWORD: Admin2026!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 You can now login with the new password!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

resetPassword();