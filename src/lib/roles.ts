export type DatabaseOrgRole = "admin" | "supervisor" | "technician";
export type CompatibilityRole = "owner" | "plant_manager" | "viewer" | "operator";
export type CanonicalRole = DatabaseOrgRole | "viewer";
export type AppRole = DatabaseOrgRole | CompatibilityRole;

export const APP_ROLE_VALUES: AppRole[] = [
    "owner",
    "admin",
    "supervisor",
    "plant_manager",
    "technician",
    "operator",
    "viewer",
];

const ROLE_RANK: Record<CanonicalRole, number> = {
    viewer: 0,
    technician: 1,
    supervisor: 2,
    admin: 3,
};

export function normalizeRole(role: unknown, fallback: CanonicalRole = "viewer"): CanonicalRole {
    const value = String(role ?? "").trim().toLowerCase();
    switch (value) {
        case "owner":
        case "admin":
            return "admin";
        case "plant_manager":
        case "supervisor":
            return "supervisor";
        case "operator":
        case "technician":
            return "technician";
        case "viewer":
            return "viewer";
        default:
            return fallback;
    }
}

export function isWritableOrgRole(role: unknown): role is DatabaseOrgRole {
    return role === "admin" || role === "supervisor" || role === "technician";
}

export function toWritableOrgRole(role: unknown, fallback: DatabaseOrgRole = "technician"): DatabaseOrgRole {
    const normalized = normalizeRole(role, fallback);
    return normalized === "viewer" ? fallback : normalized;
}

export function hasMinimumRole(actualRole: unknown, requiredRole: unknown): boolean {
    const actual = normalizeRole(actualRole);
    const required = normalizeRole(requiredRole);
    return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export function roleSatisfiesAny(actualRole: unknown, allowedRoles: readonly unknown[]): boolean {
    if (!allowedRoles.length) return false;
    return allowedRoles.some((allowedRole) => hasMinimumRole(actualRole, allowedRole));
}

export function canManageMembers(role: unknown): boolean {
    return hasMinimumRole(role, "admin");
}

export function canManageMachines(role: unknown): boolean {
    return hasMinimumRole(role, "supervisor");
}

export function canManageWorkOrders(role: unknown): boolean {
    return hasMinimumRole(role, "supervisor");
}

export function canExecuteWorkOrders(role: unknown): boolean {
    return hasMinimumRole(role, "technician");
}

export function isViewOnlyRole(role: unknown): boolean {
    return normalizeRole(role) === "viewer";
}

export function getRoleBadgeLabel(role: unknown): string {
    const normalized = normalizeRole(role);
    switch (normalized) {
        case "admin":
            return "Admin";
        case "supervisor":
            return "Supervisor";
        case "technician":
            return "Technician";
        default:
            return "Viewer";
    }
}
