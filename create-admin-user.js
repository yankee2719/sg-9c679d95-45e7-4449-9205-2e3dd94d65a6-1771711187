const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

console.log('🔑 Using Supabase URL:', supabaseUrl);
console.log('🔑 Service Key length:', supabaseServiceKey?.length || 0);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    console.log('🔄 Creating admin user...');
    
    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'denis.sernagiotto@outlook.it',
      password: 'Admin2026!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Denis Sernagiotto'
      }
    });

    if (authError) {
      console.error('❌ Auth error:', authError.message);
      process.exit(1);
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: 'denis.sernagiotto@outlook.it',
        full_name: 'Denis Sernagiotto',
        role: 'admin'
      });

    if (profileError) {
      console.error('❌ Profile error:', profileError.message);
      process.exit(1);
    }

    console.log('✅ Profile created with admin role');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 USER ID:', authData.user.id);
    console.log('📧 EMAIL: denis.sernagiotto@outlook.it');
    console.log('🔐 PASSWORD: Admin2026!');
    console.log('👤 ROLE: admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Admin user created successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

createAdminUser();