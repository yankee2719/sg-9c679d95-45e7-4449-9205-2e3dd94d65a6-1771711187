const fs = require('fs');
const { createClient } = require("@supabase/supabase-js");

// Read .env.local to get the service key
console.log("Reading configuration...");
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  
  if (!supabaseServiceKey) {
    const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
    if (keyMatch) supabaseServiceKey = keyMatch[1].trim();
  }
  
  if (!supabaseUrl) {
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    if (urlMatch) supabaseUrl = urlMatch[1].trim();
  }
} catch (e) {
  console.log("Could not read .env.local, relying on process.env");
}

if (!supabaseServiceKey || !supabaseUrl) {
  console.error("❌ Missing credentials. Please check .env.local");
  process.exit(1);
}

// User details
const userId = "6dc4cd76-c961-458d-9d63-01f403c02f87";
const newPassword = "Admin2026!";

console.log("=== Starting Password Reset ===");
console.log("User ID:", userId);
console.log("New Password:", newPassword);

// Create Supabase Admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Reset password
async function resetPassword() {
  try {
    console.log("\n=== Calling Supabase Admin API ===");
    
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error("❌ ERROR:", error.message);
      process.exit(1);
    }

    console.log("\n✅ SUCCESS! Password reset completed!");
    console.log("User:", data.user.email);
    console.log("\n🔐 NEW CREDENTIALS:");
    console.log("Email: denis.sernagiotto@outlook.it");
    console.log("Password: Admin2026!");
    console.log("\nYou can now login with these credentials!");
    
  } catch (err) {
    console.error("❌ UNEXPECTED ERROR:", err);
    process.exit(1);
  }
}

resetPassword();