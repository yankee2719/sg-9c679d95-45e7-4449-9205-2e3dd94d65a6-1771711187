import { supabase } from "@/integrations/supabase/client";

export interface UserContext {
  userId: string;
  orgId: string | null;
  orgType: string | null;
  role: string;
  displayName: string;
  email: string;
}

/**
 * Small in-memory cache to avoid UI flicker + repeated calls.
 * Cleared on auth state changes.
 */
let ctxCache: { value: UserContext | null; ts: number } = { value: null, ts: 0 };
const CACHE_TTL_MS = 30_000;

function now() {
  return Date.now();
}

export function clearUserContextCache() {
  ctxCache = { value: null, ts: 0 };
}

/**
 * HARDENED: single source of truth via RPC (Security Definer).
 * Fallback (legacy) is kept only as a safety net.
 */
export async function getUserContext(force = false): Promise<UserContext | null> {
  if (!force && ctxCache.value && now() - ctxCache.ts < CACHE_TTL_MS) {
    return ctxCache.value;
  }

  // 1) Must have auth user
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    console.error("getUserContext auth.getUser error:", userErr);
  }
  if (!user) {
    clearUserContextCache();
    return null;
  }

  // 2) Preferred: RPC (atomic + consistent)
  try {
    const { data, error } = await supabase.rpc("get_user_context");

    if (error) throw error;

    // Supabase rpc returns array-like for set-returning functions (usually 0 or 1 row)
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      // If profiles row missing, treat as not ready
      throw new Error("get_user_context returned no row (profile missing?)");
    }

    const ctx: UserContext = {
      userId: row.user_id ?? user.id,
      orgId: row.org_id ?? null,
      orgType: row.org_type ?? null,
      role: row.role ?? "technician",
      displayName:
        row.display_name ??
        user.email?.split("@")[0] ??
        "User",
      email: row.email ?? user.email ?? "",
    };

    // HARD FAIL: if you’re logged-in, org should usually exist in this app
    // (If you want to allow “no org yet”, change this behavior.)
    if (!ctx.orgId || !ctx.orgType) {
      throw new Error("Context incompleto: orgId/orgType null (profile default_organization_id o RLS/seed errati)");
    }

    ctxCache = { value: ctx, ts: now() };
    return ctx;
  } catch (e) {
    console.warn("getUserContext RPC failed, falling back:", e);
  }

  // 3) Fallback legacy (keep it strict + non-silent)
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("default_organization_id, display_name, email, first_name, last_name")
    .eq("id", user.id)
    .single();

  if (pErr) {
    console.error("getUserContext fallback profile error:", pErr);
    clearUserContextCache();
    return null;
  }

  const orgId: string | null = (profile as any)?.default_organization_id ?? null;

  if (!orgId) {
    // same hard-fail semantics
    throw new Error("default_organization_id mancante in profiles: impossibile determinare organizzazione.");
  }

  const { data: membership, error: mErr } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .single();

  if (mErr) {
    console.error("getUserContext fallback membership error:", mErr);
    throw new Error("Impossibile leggere organization_memberships per determinare role.");
  }

  const { data: org, error: oErr } = await supabase
    .from("organizations")
    .select("type")
    .eq("id", orgId)
    .single();

  if (oErr) {
    console.error("getUserContext fallback organizations error:", oErr);
    throw new Error("Impossibile leggere organizations.type per determinare orgType.");
  }

  const displayName =
    (profile as any)?.display_name ||
    (profile as any)?.first_name ||
    user.email?.split("@")[0] ||
    "User";

  const ctx: UserContext = {
    userId: user.id,
    orgId,
    orgType: (org as any)?.type ?? null,
    role: (membership as any)?.role ?? "technician",
    displayName,
    email: (profile as any)?.email || user.email || "",
  };

  if (!ctx.orgType) {
    throw new Error("orgType non risolto - RLS o dati organizations incompleti.");
  }

  ctxCache = { value: ctx, ts: now() };
  return ctx;
}

export async function getProfileData(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, first_name, last_name, default_organization_id, email")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("getProfileData error:", error);
    return null;
  }
  if (!data) return null;

  // Get role from membership
  let role = "technician";
  if ((data as any).default_organization_id) {
    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("role")
      .eq("user_id", userId)
      .eq("organization_id", (data as any).default_organization_id)
      .eq("is_active", true)
      .single();

    if ((membership as any)?.role) role = (membership as any).role;
  }

  return {
    full_name:
      (data as any).display_name ||
      `${(data as any).first_name || ""} ${(data as any).last_name || ""}`.trim() ||
      null,
    role,
    tenant_id: (data as any).default_organization_id,
  };
}

export async function getNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) return 0;
  return count || 0;
}

/**
 * Recommended: clear cache when auth changes (call once in _app.tsx)
 */
export function initAuthContextCacheListener() {
  supabase.auth.onAuthStateChange(() => {
    clearUserContextCache();
  });
}