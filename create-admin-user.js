/**
 * Script to create the first admin user
 * Run with: node create-admin-user.js
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

async function createFirstAdmin() {
  console.log("🚀 Creating first admin user...\n");

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/create-admin-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email: "admin@maintenance.com",
          password: "Admin123!",
          fullName: "System Administrator",
          role: "admin",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Error creating admin:", data);
      console.error("\nStatus:", response.status);
      return;
    }

    console.log("✅ Admin user created successfully!\n");
    console.log("📧 Email: admin@maintenance.com");
    console.log("🔑 Password: Admin123!\n");
    console.log("👉 Go to /login and sign in with these credentials\n");
    console.log("Response:", JSON.stringify(data, null, 2));

  } catch (err) {
    console.error("❌ Unexpected error:", err.message);
  }
}

createFirstAdmin();