// src/lib/supabaseHelpers.ts
import { supabase } from "@/integrations/supabase/client";

export interface UserContext {
  userId: string;
  orgId: string | null;
  orgType: string | null; // "manufacturer" | "customer" | null
  role: string; // "admin" | "supervisor" | "technician" | ...
  displayName: string;
  email: string;
}

/**
 * Small sleep helper
 */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type OrgType = "manufacturer" | "customer";

type MembershipRow = {
  organization_id: string;
  role: string;
  is_active: boolean;
};

type OrgRow = {
  id: string;
  type: OrgType | string | null;
  name?: string | null;
};

function normalizeOrgType(raw: any): OrgType | null {
  const t = String(raw ?? "").toLowerCase();
  if (t === "manufacturer") return "manufacturer";
  if (t === "customer") return "customer";
  return null;
}

/**
 * Pick the "best" org for this user:
 * 1) prefer manufacturer (so builders always land in builder mode)
 * 2) otherwise customer
 * 3) otherwise fallback to profile.default_organization_id (if present)
 */
function pickBestOrg(
  memberships: Array<MembershipRow & { org?: OrgRow | null }>,
  fallbackOrgId: string | null
): { orgId: string | null; orgType: OrgType | null; role: string } {
  const active = memberships.filter((m) => m.is_active && m.organization_id);

  // manufacturer first
  const manufacturer = active.find((m) => normalizeOrgType(m.org?.type) === "manufacturer");
  if (manufacturer) {
    return {
      orgId: manufacturer.organization_id,
      orgType: "manufacturer",
      role: manufacturer.role || "technician",
    };
  }

  // customer second
  const customer = active.find((m) => normalizeOrgType(m.org?.type) === "customer");
  if (customer) {
    return {
      orgId: customer.organization_id,
      orgType: "customer",
      role: customer.role || "technician",
    };
  }

  // fallback: default_organization_id (unknown type until fetched)
  if (fallbackOrgId) {
    return { orgId: fallbackOrgId, orgType: null, role: "technician" };
  }

  return { orgId: null, orgType: null, role: "technician" };
}

/**
 * Robust user context (NO RANDOM):
 * - Always uses auth.getSession()
 * - Always resolves orgId from membership priority (manufacturer first)
 * - Always resolves orgType from organizations table (DB truth)
 * - HARD FAIL if orgType cannot be resolved (prevents wrong UI on refresh)
 */
export async function getUserContext(): Promise<UserContext | null> {
  const maxAttempts = 8; // ~1.6s total with 200ms sleeps

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // 1) Session first
    const {
      data: { session },
      error: sessErr,
    } = await supabase.auth.getSession();

    if (sessErr) {
      if (attempt < maxAttempts) {
        await sleep(200);
        continue;
      }
      throw sessErr;
    }

    const user = session?.user ?? null;
    if (!user) {
      if (attempt < maxAttempts) {
        await sleep(200);
        continue;
      }
      return null;
    }

    // 2) Profile
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

    const fallbackOrgId = (profile as any)?.default_organization_id ?? null;

    // 3) Memberships (active) + org types
    const { data: memRows, error: memErr } = await supabase
      .from("organization_memberships")
      .select("organization_id, role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (memErr) {
      if (attempt < maxAttempts) {
        await sleep(200);
        continue;
      }
      throw memErr;
    }

    const membershipList = (memRows ?? []) as MembershipRow[];
    const orgIds = Array.from(new Set(membershipList.map((m) => m.organization_id).filter(Boolean)));

    let orgMap = new Map<string, OrgRow>();
    if (orgIds.length > 0) {
      const { data: orgRows, error: orgErr } = await supabase
        .from("organizations")
        .select("id,type,name")
        .in("id", orgIds);

      if (orgErr) {
        if (attempt < maxAttempts) {
          await sleep(200);
          continue;
        }
        throw orgErr;
      }

      (orgRows ?? []).forEach((o: any) => orgMap.set(o.id, o));
    }

    const enriched = membershipList.map((m) => ({
      ...m,
      org: orgMap.get(m.organization_id) ?? null,
    }));

    // 4) Pick best org
    const picked = pickBestOrg(enriched, fallbackOrgId);

    // 5) If we still don't have orgType, fetch it by orgId (fallback path)
    let finalOrgType: OrgType | null = picked.orgType;
    if (!finalOrgType && picked.orgId) {
      const { data: orgRow, error: orgErr2 } = await supabase
        .from("organizations")
        .select("type")
        .eq("id", picked.orgId)
        .maybeSingle();

      if (orgErr2) {
        if (attempt < maxAttempts) {
          await sleep(200);
          continue;
        }
        throw orgErr2;
      }

      finalOrgType = normalizeOrgType((orgRow as any)?.type);
    }

    // HARD FAIL: if we have orgId but not orgType -> no more random UI
    if (picked.orgId && !finalOrgType) {
      if (attempt < maxAttempts) {
        await sleep(200);
        continue;
      }
      throw new Error("orgType non risolto - membership/default org incoerenti o RLS blocca organizations.type");
    }

    const displayName =
      (profile as any)?.display_name ||
      (profile as any)?.first_name ||
      user.email?.split("@")[0] ||
      "User";

    return {
      userId: user.id,
      orgId: picked.orgId,
      orgType: finalOrgType,
      role: picked.role || "technician",
      displayName,
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

  // Keep old behavior here (used in UI places), but now context is robust anyway.
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