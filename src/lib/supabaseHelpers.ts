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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type OrgType = "manufacturer" | "customer";

type MembershipRow = {
  organization_id: string;
  role: string | null;
  is_active: boolean;
};

type OrgRow = {
  id: string;
  type: OrgType | string | null;
  name?: string | null;
};

function normalizeOrgType(raw: unknown): OrgType | null {
  const t = String(raw ?? "").toLowerCase();
  if (t === "manufacturer") return "manufacturer";
  if (t === "customer") return "customer";
  return null;
}

function selectActiveOrganization(
  memberships: MembershipRow[],
  orgMap: Map<string, OrgRow>,
  defaultOrgId: string | null
): { orgId: string | null; orgType: OrgType | null; role: string } {
  const activeMemberships = memberships.filter(
    (m) => m.is_active && !!m.organization_id
  );

  if (activeMemberships.length === 0) {
    return {
      orgId: defaultOrgId ?? null,
      orgType: null,
      role: "technician",
    };
  }

  // 1) Real active org from profile.default_organization_id
  if (defaultOrgId) {
    const defaultMembership = activeMemberships.find(
      (m) => m.organization_id === defaultOrgId
    );

    if (defaultMembership) {
      const org = orgMap.get(defaultOrgId) ?? null;
      return {
        orgId: defaultOrgId,
        orgType: normalizeOrgType(org?.type),
        role: defaultMembership.role || "technician",
      };
    }
  }

  // 2) Fallback: first active membership
  // Stable enough until you add an explicit org switcher everywhere.
  const first = activeMemberships[0];
  const org = orgMap.get(first.organization_id) ?? null;

  return {
    orgId: first.organization_id,
    orgType: normalizeOrgType(org?.type),
    role: first.role || "technician",
  };
}

/**
 * Robust user context:
 * - reads current session
 * - resolves active org from profiles.default_organization_id
 * - falls back to first active membership only if needed
 * - resolves orgType ONLY from organizations.type (DB truth)
 * - fails hard if orgId exists but orgType cannot be resolved
 */
export async function getUserContext(): Promise<UserContext | null> {
  const maxAttempts = 8;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const user = session?.user ?? null;
      if (!user) {
        if (attempt < maxAttempts) {
          await sleep(200);
          continue;
        }
        return null;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("default_organization_id, display_name, email, first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const defaultOrgId =
        (profile as any)?.default_organization_id ?? null;

      const { data: membershipRows, error: membershipError } = await supabase
        .from("organization_memberships")
        .select("organization_id, role, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (membershipError) throw membershipError;

      const memberships = (membershipRows ?? []) as MembershipRow[];

      const orgIds = Array.from(
        new Set(
          memberships
            .map((m) => m.organization_id)
            .filter(Boolean)
        )
      );

      if (defaultOrgId && !orgIds.includes(defaultOrgId)) {
        orgIds.push(defaultOrgId);
      }

      const orgMap = new Map<string, OrgRow>();

      if (orgIds.length > 0) {
        const { data: orgRows, error: orgError } = await supabase
          .from("organizations")
          .select("id, type, name")
          .in("id", orgIds);

        if (orgError) throw orgError;

        for (const row of orgRows ?? []) {
          orgMap.set((row as any).id, row as OrgRow);
        }
      }

      const selected = selectActiveOrganization(
        memberships,
        orgMap,
        defaultOrgId
      );

      let resolvedOrgType = selected.orgType;

      if (!resolvedOrgType && selected.orgId) {
        const { data: orgRow, error: orgError } = await supabase
          .from("organizations")
          .select("type")
          .eq("id", selected.orgId)
          .maybeSingle();

        if (orgError) throw orgError;

        resolvedOrgType = normalizeOrgType((orgRow as any)?.type);
      }

      if (selected.orgId && !resolvedOrgType) {
        throw new Error(
          "orgType non risolto: organizations.type mancante o non accessibile via RLS"
        );
      }

      const displayName =
        (profile as any)?.display_name ||
        (profile as any)?.first_name ||
        user.email?.split("@")[0] ||
        "User";

      return {
        userId: user.id,
        orgId: selected.orgId,
        orgType: resolvedOrgType,
        role: selected.role || "technician",
        displayName,
        email: (profile as any)?.email || user.email || "",
      };
    } catch (error) {
      if (attempt < maxAttempts) {
        await sleep(200);
        continue;
      }
      throw error;
    }
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