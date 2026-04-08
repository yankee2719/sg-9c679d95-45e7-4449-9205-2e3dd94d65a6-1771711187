export type OrgRole = "admin" | "supervisor" | "technician";
export type LegacyRoleAlias = "owner" | "plant_manager" | "viewer" | "operator";
export type AnyAppRole = OrgRole | LegacyRoleAlias;

const ROLE_RANK: Record<OrgRole, number> = {
    admin: 3,
    supervisor: 2,
    technician: 1,
};

export function normalizeOrgRole(role: string | null | undefined): OrgRole | null {
    switch (String(role ?? "").trim().toLowerCase()) {
        case "owner":
        case "admin":
            return "admin";
        case "plant_manager":
        case "supervisor":
            return "supervisor";
        case "technician":
        case "operator":
        case "viewer":
            return "technician";
        default:
            return null;
    }
}

export function coerceOrgRole(role: string | null | undefined, fallback: OrgRole = "technician"): OrgRole {
    return normalizeOrgRole(role) ?? fallback;
}

export function hasMinimumRole(userRole: string | null | undefined, requiredRole: OrgRole): boolean {
    const normalized = normalizeOrgRole(userRole);
    if (!normalized) return false;
    return ROLE_RANK[normalized] >= ROLE_RANK[requiredRole];
}

export function canManageOrganization(role: string | null | undefined): boolean {
    return hasMinimumRole(role, "supervisor");
}

export function canManageUsers(role: string | null | undefined): boolean {
    return normalizeOrgRole(role) === "admin";
}

export function canExecuteWorkOrders(role: string | null | undefined): boolean {
    return ["admin", "supervisor", "technician"].includes(normalizeOrgRole(role) ?? "");
}

