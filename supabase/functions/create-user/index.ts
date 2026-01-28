import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { email, password, fullName, role } = await req.json();

    console.log("Creating user:", email);

    // Create user with admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      throw authError;
    }

    if (!authData?.user) {
      throw new Error("No user data returned");
    }

    const userId = authData.user.id;
    console.log("User created with ID:", userId);

    // Create profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email: email,
        full_name: fullName,
        role: role || "technician",
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (profileError) {
      console.error("Profile error:", profileError);
      throw profileError;
    }

    console.log("Profile created successfully");

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          email: email,
          full_name: fullName,
          role: role,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});