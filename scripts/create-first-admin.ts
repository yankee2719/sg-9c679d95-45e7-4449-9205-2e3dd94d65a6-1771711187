/**
 * Script to create the first admin user in the system
 * Run with: npx ts-node scripts/create-first-admin.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createFirstAdmin() {
  console.log("🚀 Creating first admin user...");

  try {
    const { data, error } = await supabase.functions.invoke("create-admin-user", {
      body: {
        email: "admin@maintenance.com",
        password: "Admin123!",
        fullName: "System Administrator",
        role: "admin",
      },
    });

    if (error) {
      console.error("❌ Error creating admin:", error);
      return;
    }

    console.log("✅ Admin user created successfully!");
    console.log("📧 Email: admin@maintenance.com");
    console.log("🔑 Password: Admin123!");
    console.log("\n👉 Go to /login and sign in with these credentials");
    console.log(data);

  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

createFirstAdmin();