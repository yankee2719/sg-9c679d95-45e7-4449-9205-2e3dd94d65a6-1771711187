/**
 * Setup script to ensure admin user profile exists
 * This uses Service Role Key to bypass RLS and create/update admin profile
 * Run with: node setup-admin.js
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = "denis.sernagiotto@outlook.it";
const adminName = "Denis Sernagiotto";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  console.error("   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Create Supabase Admin client with Service Role Key (bypasses RLS + Rate Limits)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupAdminProfile() {
  console.log("🔧 Setting up admin profile...\n");

  try {
    // STEP 1: List all users to find the admin user
    console.log("📋 Fetching all users from auth.users...");
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("❌ Error listing users:", listError.message);
      return;
    }

    console.log(`✅ Found ${users.length} user(s) in auth.users\n`);

    // Find admin user
    const adminUser = users.find(u => u.email === adminEmail);

    if (!adminUser) {
      console.error(`❌ User with email ${adminEmail} not found in auth.users`);
      console.log("\n💡 The user must be created first. Please:");
      console.log("   1. Wait 10 minutes for rate limit to reset");
      console.log("   2. Try logging in at /login (user might already exist)");
      console.log("   3. Or try registering at /register");
      return;
    }

    console.log("✅ Admin user found in auth.users:");
    console.log("   🆔 User ID:", adminUser.id);
    console.log("   📧 Email:", adminUser.email);
    console.log("   ✅ Email Confirmed:", adminUser.email_confirmed_at ? "Yes" : "No");
    console.log("   📅 Created:", new Date(adminUser.created_at).toLocaleString());

    // STEP 2: Check if profile exists
    console.log("\n👤 Checking for existing profile...");
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", adminUser.id)
      .maybeSingle();

    if (profileCheckError) {
      console.error("❌ Error checking profile:", profileCheckError.message);
      return;
    }

    if (existingProfile) {
      console.log("✅ Profile exists:");
      console.log("   👤 Name:", existingProfile.full_name);
      console.log("   🔑 Role:", existingProfile.role);
      console.log("   ✅ Active:", existingProfile.is_active);

      // Update to admin if not already
      if (existingProfile.role !== "admin") {
        console.log("\n🔄 Updating role to admin...");
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ 
            role: "admin", 
            is_active: true,
            full_name: adminName,
            updated_at: new Date().toISOString()
          })
          .eq("id", adminUser.id);

        if (updateError) {
          console.error("❌ Error updating profile:", updateError.message);
          return;
        }

        console.log("✅ Profile updated to admin role!");
      } else {
        console.log("✅ Profile already has admin role - no update needed!");
      }
    } else {
      // Create new profile
      console.log("⚠️  Profile not found - creating new profile...");
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: adminUser.id,
          email: adminEmail,
          full_name: adminName,
          role: "admin",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error("❌ Error creating profile:", insertError.message);
        console.error("   Details:", insertError);
        return;
      }

      console.log("✅ Profile created successfully!");
      console.log("   👤 Name:", newProfile.full_name);
      console.log("   🔑 Role:", newProfile.role);
    }

    // STEP 3: Final verification
    console.log("\n🔍 Final verification...");
    const { data: finalProfile, error: finalError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", adminUser.id)
      .single();

    if (finalError) {
      console.error("❌ Verification failed:", finalError.message);
      return;
    }

    console.log("\n✅✅✅ SUCCESS! Admin profile is ready! ✅✅✅");
    console.log("\n📋 Login Information:");
    console.log("   🌐 URL: http://localhost:3000/login");
    console.log("   📧 Email:", adminEmail);
    console.log("   🔑 Password: Admin123!!!");
    console.log("\n👤 Profile Details:");
    console.log("   🆔 User ID:", finalProfile.id);
    console.log("   👤 Name:", finalProfile.full_name);
    console.log("   🔑 Role:", finalProfile.role);
    console.log("   ✅ Active:", finalProfile.is_active);
    console.log("\n🎉 You can now login to the application!");

  } catch (error) {
    console.error("\n❌ Unexpected error:", error.message);
    console.error("   Stack:", error.stack);
  }
}

setupAdminProfile();