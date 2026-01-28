const { createClient } = require("@supabase/supabase-js");

// Supabase credentials from .env.local
const supabaseUrl = "https://gfygjissdhwhulzvowjt.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmeWdqaXNzZGh3aHVsenZvd2p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzk5MTA1NywiZXhwIjoyMDUzNTY3MDU3fQ.qBVvKrYMLb7qH1yVJfv9sZSIsImlhdCI6MTc2OTUyODI5NywiZXhwIjoyMDg1MTA0Mjk3fQ.VYm5ypmuKN5vHh0hJOZ8wF9s9z-xEPqJBZYLNxJMd1M";

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