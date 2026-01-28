import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// CRITICAL: Must include ALL headers that Supabase JS SDK sends automatically
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": 
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log("=== Edge Function create-user invoked ===");
  console.log("Method:", req.method);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("CORS preflight request - responding with 200");
    return new Response("ok", { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  // Validate request method
  if (req.method !== "POST") {
    console.log("Invalid method:", req.method);
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse request body FIRST to see what we're working with
    const body = await req.json();
    console.log("=== REQUEST BODY ===");
    console.log("Email:", body.email);
    console.log("Role:", body.role);
    console.log("Full Name:", body.full_name);

    // Get JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("✅ JWT token received (length):", token.length);

    // Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing Supabase environment variables");
      console.log("SUPABASE_URL exists:", !!supabaseUrl);
      console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!supabaseServiceKey);
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Supabase environment variables loaded");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log("✅ Supabase Admin client initialized");

    // Verify JWT and get user
    console.log("🔍 Verifying JWT...");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("❌ JWT verification failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token", details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ JWT verified successfully for user:", user.id);

    // Check if user is admin
    console.log("🔍 Checking admin role...");
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("❌ Failed to fetch user profile:", profileError.message);
      console.error("Profile error code:", profileError.code);
      console.error("Profile error details:", profileError.details);
      return new Response(
        JSON.stringify({ error: "Failed to verify user permissions", details: profileError.message }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile) {
      console.error("❌ Profile not found for user:", user.id);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ User profile found, role:", profile.role);

    if (profile.role !== "admin") {
      console.error("❌ User is not admin. Current role:", profile.role);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ User is admin - proceeding with user creation");

    const { email, password, role, full_name } = body;

    // Validate required fields
    if (!email || !password || !role) {
      console.error("❌ Missing required fields");
      console.log("Email present:", !!email);
      console.log("Password present:", !!password);
      console.log("Role present:", !!role);
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRoles = ["admin", "supervisor", "technician"];
    if (!validRoles.includes(role)) {
      console.error("❌ Invalid role:", role);
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be: admin, supervisor, or technician" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ All validations passed");
    console.log("🔧 Creating user in Supabase Auth...");

    // Create user in Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || null,
        role: role
      }
    });

    if (createError) {
      console.error("❌ Error creating user in Auth:");
      console.error("Error message:", createError.message);
      console.error("Error status:", createError.status);
      console.error("Error name:", createError.name);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create user in Auth", 
          details: createError.message 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newUser || !newUser.user) {
      console.error("❌ User created but response is empty");
      return new Response(
        JSON.stringify({ error: "User creation failed - empty response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ User created successfully in Auth!");
    console.log("User ID:", newUser.user.id);
    console.log("User email:", newUser.user.email);
    console.log("User metadata:", newUser.user.user_metadata);

    // Wait for trigger to create profile
    console.log("⏳ Waiting 500ms for database trigger to create profile...");
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify profile was created by trigger
    console.log("🔍 Verifying profile creation...");
    const { data: createdProfile, error: profileCheckError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", newUser.user.id)
      .single();

    if (profileCheckError) {
      console.error("❌ Profile was not created by trigger:");
      console.error("Error message:", profileCheckError.message);
      console.error("Error code:", profileCheckError.code);
      console.error("Error details:", profileCheckError.details);
      
      // Try to delete the auth user if profile creation failed
      console.log("🗑️ Attempting to delete auth user due to profile creation failure...");
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to create user profile", 
          details: `Database trigger did not create profile. Error: ${profileCheckError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!createdProfile) {
      console.error("❌ Profile query succeeded but no profile found");
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: "Profile not found after creation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Profile verified successfully!");
    console.log("Profile ID:", createdProfile.id);
    console.log("Profile email:", createdProfile.email);
    console.log("Profile full_name:", createdProfile.full_name);
    console.log("Profile role:", createdProfile.role);

    // Return success response
    console.log("🎉 User creation completed successfully!");
    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: newUser.user.id,
          email: email,
          role: createdProfile.role,
          full_name: createdProfile.full_name
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("❌ UNEXPECTED ERROR in create-user function:");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});