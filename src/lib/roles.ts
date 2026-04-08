import type { Database } from "@/integrations/supabase/database.types";

export type RealOrgRole = Database["public"]["Enums"]["org_role"];
export type LegacyOrgRoleAlias = "owner" | "plant_manager" | "viewer" | "operator";
export type RoleLike = RealOrgRole | LegacyOrgRoleAlias | string | null | undefined;

export function normalizeOrgRole(role: RoleLike): RealOrgRole | null {
    switch (String(role ?? "").toLowerCase()) {
        case "owner":
        case "admin":
            return "admin";
        case "plant_manager":
        case "supervisor":
            return "supervisor";
        case "operator":
        case "technician":
            return "technician";
        default:
            return null;
    }
}

export function isLegacyReadOnlyRole(role: RoleLike): boolean {
    return String(role ?? "").toLowerCase() === "viewer";
}

export function hasMinimumOrgRole(role: RoleLike, minimum: RealOrgRole): boolean {
    const normalized = normalizeOrgRole(role);
    if (!normalized) return false;
    const rank: Record<RealOrgRole, number> = { admin: 3, supervisor: 2, technician: 1 };
    return rank[normalized] >= rank[minimum];
}

export function canManageOrg(role: RoleLike): boolean {
    return hasMinimumOrgRole(role, "supervisor");
}

export function canAdminOrg(role: RoleLike): boolean {
    return hasMinimumOrgRole(role, "admin");
}

export function getRoleDisplayLabel(role: RoleLike): string {
    switch (String(role ?? "").toLowerCase()) {
        case "owner":
        case "admin":
            return "Admin";
        case "plant_manager":
        case "supervisor":
            return "Supervisor";
        case "operator":
        case "technician":
            return "Technician";
        case "viewer":
            return "Viewer";
        default:
            return String(role || "Unknown");
    }
}
