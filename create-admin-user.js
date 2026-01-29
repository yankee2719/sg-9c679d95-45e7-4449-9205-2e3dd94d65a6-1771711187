/**
 * Script to create admin user via API endpoint
 * Run with: node create-admin-user.js
 */

const BASE_URL = "http://localhost:3000";

async function createAdminUser() {
  console.log("🚀 Creating admin user...\n");

  const userData = {
    email: "denis.sernagiotto@outlook.it",
    password: "Admin123!!!",
    fullName: "Denis Sernagiotto",
    role: "admin",
    phone: "",
  };

  try {
    const response = await fetch(`${BASE_URL}/api/admin/create-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Admin user created successfully!");
      console.log("\n📧 Email:", data.user.email);
      console.log("🆔 User ID:", data.user.id);
      console.log("👤 Name:", data.user.profile.full_name);
      console.log("🔑 Role:", data.user.profile.role);
      console.log("\n🎉 You can now login with:");
      console.log("   Email:", userData.email);
      console.log("   Password: [hidden for security]");
      console.log("\n🌐 Login URL: http://localhost:3000/login");
    } else {
      console.error("❌ Error creating user:");
      console.error(data.error || "Unknown error");
      
      if (data.error && data.error.includes("already")) {
        console.log("\n💡 User might already exist. Try logging in directly.");
      }
    }
  } catch (error) {
    console.error("❌ Request failed:", error.message);
    console.log("\n⚠️  Make sure the Next.js server is running:");
    console.log("   npm run dev");
  }
}

createAdminUser();