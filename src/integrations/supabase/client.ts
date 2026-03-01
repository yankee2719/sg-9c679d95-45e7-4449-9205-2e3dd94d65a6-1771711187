import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Se mancano, non avrai header apikey -> "No API key found in request"
if (!supabaseUrl || !supabaseAnonKey) {
    // Non throw qui: su Next può esplodere in build/SSR. Log basta.
    console.error("[Supabase] Missing env vars", {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
    });
}

export const supabase = createClient < Database > (supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "machina-auth",
    },
});