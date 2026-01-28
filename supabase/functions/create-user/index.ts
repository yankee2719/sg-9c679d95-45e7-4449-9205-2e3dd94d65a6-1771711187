import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    // Parse request body
    const body = await req.json();
    console.log("Request body received:", {
      hasEmail: !!body.email,
      hasPassword: !!body.password,
      hasRole: !!body.role,
      hasFullName: !!body.full_name
    });

    // TEST MODE: Always return success for now
    console.log("TEST MODE: Returning success without creating user");
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "TEST: Edge Function is working! CORS fixed!",
        receivedData: {
          email: body.email,
          role: body.role,
          full_name: body.full_name || null
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in create-user function:", error);
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