// src/lib/supabaseHelpers.ts
import { supabase } from "@/integrations/supabase/client";

export interface UserContext {
  userId: string;
  orgId: string | null;
  orgType: "manufacturer" | "customer" | null;
  role: string;
  displayName: string;
  email: string;
}

/**
 * Small sleep helper
 */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeOrgType(v: any): "manufacturer" | "customer" | null {
  const t = String(v ?? "").toLowerCase();
  if (t === "manufacturer") return "manufacturer";
  if (t === "customer") return "customer";
  return null;
}

function ctxCacheKey(userId: string) {
  return `machina_ctx_${userId}`;
}

type MembershipRow = {
  organization_id: string;
  role: string;
  organizations?: { type: any; name?: string | null } | null;
};

async function safeGetCachedOrg(userId: string): Promise<{ orgId: string; orgType: "manufacturer" | "customer" } | null> {
  try {
    const raw = sessionStorage.getItem(ctxCacheKey(userId));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj?.orgId) return null;
    const type = normalizeOrgType(obj?.orgType);
    if (!type) return null;
    return { orgId: obj.orgId, orgType: type };
  } catch {
    return null;
  }
}

function setCachedOrg(userId: string, orgId: string, orgType: "manufacturer" | "customer") {
  try {
    sessionStorage.setItem(ctxCacheKey(userId), JSON.stringify({ orgId, orgType }));
  } catch {
    // ignore
  }
}

/**
 * Decide orgId in modo deterministico:
 * - Preferisci org cache (stabile dopo refresh)
 * - Se default_organization_id esiste, usalo SOLO se membership attiva esiste
 * - Altrimenti scegli membership: preferisci manufacturer
 */
async function resolveActiveOrg(userId: string): Promise<{ orgId: string; orgType: "manufacturer" | "customer"; role: string } | null> {
  // 1) memberships (source of truth)
  const { data: memberships, error: memErr } = await supabase
    .from("organization_memberships")
    .select("organization_id, role, organizations(type, name)")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (memErr) throw memErr;

  const rows = (memberships ?? []) as MembershipRow[];
  if (rows.length === 0) return null;

  // 2) prova cached org, ma SOLO se esiste in memberships
  const cached = await safeGetCachedOrg(userId);
  if (cached) {
    const hit = rows.find((r) => r.organization_id === cached.orgId);
    if (hit) {
      const t = normalizeOrgType(hit.organizations?.type) ?? cached.orgType;
      const role = hit.role || "technician";
      return { orgId: cached.orgId, orgType: t, role };
    }
  }

  // 3) prova default org (verificato da fuori con profile)
  // (lo gestiamo nel chiamante: se default matcha membership lo useremo)

  // 4) scegli migliore membership: manufacturer > customer
  const mfr = rows.find((r) => normalizeOrgType(r.organizations?.type) === "manufacturer");
  if (mfr) {
    return {
      orgId: mfr.organization_id,
      orgType: "manufacturer",
      role: mfr.role || "technician",
    };
  }

  const cust = rows.find((r) => normalizeOrgType(r.organizations?.type) === "customer");
  if (cust) {
    return {
      orgId: cust.organization_id,
      orgType: "customer",
      role: cust.role || "technician",
    };
  }

  // fallback: prima riga
  return {
    orgId: rows[0].organization_id,
    orgType: normalizeOrgType(rows[0].organizations?.type) ?? null,
    role: rows[0].role || "technician",
  } as any;
}

/**
 * Robust user context:
 * - Uses getSession() (more reliable after reload)
 * - Deterministic org selection (no more "random" plant/customer UI)
 */
export async function getUserContext(): Promise<UserContext | null> {
  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // 1) session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user ?? null;
    if (!user) {
      if (attempt < maxAttempts) {
        await sleep(200);
        continue;
      }
      return null;
    }

    // 2) profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("default_organization_id, display_name, email, first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      if (attempt < maxAttempts) {
        await sleep(200);
        continue;
      }
      throw profileErr;
    }

    const defaultOrgId = (profile as any)?.default_organization_id ?? null;

    // 3) memberships-based resolution (truth)
    let resolved = await resolveActiveOrg(user.id);

    if (!resolved) {
      // se non ha memberships attive, non possiamo decidere niente
      if (attempt < maxAttempts) {
        await sleep(200);
        continue;
      }
      return {
        userId: user.id,
        orgId: null,
        orgType: null,
        role: "technician",
        displayName:
          (profile as any)?.display_name ||
          (profile as any)?.first_name ||
          user.email?.split("@")[0] ||
          "User",
        email: (profile as any)?.email || user.email || "",
      };
    }

    // 4) se defaultOrgId esiste ed è tra le memberships, preferiscilo
    if (defaultOrgId) {
      try {
        const { data: mem, error: memErr } = await supabase
          .from("organization_memberships")
          .select("organization_id, role, organizations(type)")
          .eq("user_id", user.id)
          .eq("organization_id", defaultOrgId)
          .eq("is_active", true)
          .maybeSingle();

        if (!memErr && mem?.organization_id) {
          const t = normalizeOrgType((mem as any)?.organizations?.type);
          if (t) {
            resolved = {
              orgId: defaultOrgId,
              orgType: t,
              role: (mem as any)?.role || resolved.role || "technician",
            };
          }
        }
      } catch {
        // ignore, keep resolved
      }
    }

    // 5) HARD FAIL: niente tipo => stop (evita UI random)
    if (!resolved.orgType) {
      throw new Error("orgType non risolto - RLS o context errato");
    }

    // 6) cache stabile per refresh
    setCachedOrg(user.id, resolved.orgId, resolved.orgType);

    return {
      userId: user.id,
      orgId: resolved.orgId,
      orgType: resolved.orgType,
      role: resolved.role || "technician",
      displayName:
        (profile as any)?.display_name ||
        (profile as any)?.first_name ||
        user.email?.split("@")[0] ||
        "User",
      email: (profile as any)?.email || user.email || "",
    };
  }

  return null;
}

export async function getProfileData(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, first_name, last_name, default_organization_id, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  let role = "technician";

  if ((data as any).default_organization_id) {
    const { data: membership, error: memErr } = await supabase
      .from("organization_memberships")
      .select("role")
      .eq("user_id", userId)
      .eq("organization_id", (data as any).default_organization_id)
      .eq("is_active", true)
      .maybeSingle();

    if (memErr) throw memErr;
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