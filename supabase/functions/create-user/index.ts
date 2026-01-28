import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// CORS headers - Allow ALL Supabase SDK headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": 
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-api-version",
  "Access-Control-Max-Age": "86400",
};

console.log("=== Edge Function create-user starting ===");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("=== Handling CORS preflight ===");
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    console.log("=== POST request received ===");
    console.log("Request method:", req.method);
    console.log("Request headers:", JSON.stringify(Object.fromEntries(req.headers.entries())));

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("=== Environment check ===");
    console.log("SUPABASE_URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
    console.log("SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✅ Set" : "❌ Missing");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing environment variables");
      return new Response(
        JSON.stringify({ 
          error: "Server configuration error",
          details: "Missing required environment variables"
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Parse request body
    const { email, password, full_name, role } = await req.json();
    
    console.log("=== Request data ===");
    console.log("Email:", email);
    console.log("Full name:", full_name);
    console.log("Role:", role);

    if (!email || !password || !full_name || !role) {
      console.error("❌ Missing required fields");
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields",
          details: "Email, password, full_name, and role are required"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create Supabase admin client
    console.log("=== Creating Supabase admin client ===");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log("✅ Admin client created");

    // Create user in Auth
    console.log("=== Creating user in Supabase Auth ===");
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name
      }
    });

    if (authError) {
      console.error("❌ Auth error:", authError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create user in Auth",
          details: authError.message
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("✅ User created in Auth:", authData.user?.id);

    // Create profile
    console.log("=== Creating user profile ===");
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        email,
        full_name,
        role,
        two_factor_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error("❌ Profile creation error:", profileError);
      
      // Rollback: delete the auth user
      console.log("=== Rolling back auth user ===");
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to create user profile",
          details: profileError.message
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("✅ Profile created successfully");
    console.log("=== User creation completed successfully ===");

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: authData.user.id,
          email,
          full_name,
          role
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});