export type DbOrgRole = "admin" | "supervisor" | "technician";
export type LegacyAliasRole = "owner" | "plant_manager" | "viewer" | "operator";
export type AppRole = DbOrgRole | LegacyAliasRole;

export const DB_ORG_ROLES: DbOrgRole[] = ["admin", "supervisor", "technician"];
export const CREATABLE_ORG_ROLES: DbOrgRole[] = ["admin", "supervisor", "technician"];
export const ALL_APP_ROLES: AppRole[] = [
    "admin",
    "supervisor",
    "technician",
    "owner",
    "plant_manager",
    "viewer",
    "operator",
];
export const ADMIN_ONLY_ROLES: AppRole[] = ["admin", "owner"];
export const MANAGER_ROLES: AppRole[] = ["admin", "owner", "supervisor", "plant_manager"];

export function normalizeStoredRole(value: unknown): DbOrgRole | null {
    const role = String(value ?? "").trim().toLowerCase();
    switch (role) {
        case "owner":
        case "admin":
            return "admin";
        case "plant_manager":
        case "supervisor":
            return "supervisor";
        case "viewer":
        case "operator":
        case "technician":
            return "technician";
        default:
            return null;
    }
}

export function normalizeCreatableRole(value: unknown): DbOrgRole | null {
    const role = String(value ?? "").trim().toLowerCase();
    if (role === "admin" || role === "supervisor" || role === "technician") {
        return role;
    }
    return null;
}

export function isCreatableOrgRole(value: unknown): value is DbOrgRole {
    return normalizeCreatableRole(value) !== null;
}

export function roleSatisfies(actualRole: unknown, allowedRoles: readonly AppRole[]): boolean {
    const actual = normalizeStoredRole(actualRole);
    if (!actual) return false;

    const allowed = new Set(
        allowedRoles
            .map((role) => normalizeStoredRole(role))
            .filter((role): role is DbOrgRole => Boolean(role))
    );

    return allowed.has(actual);
}

export function isAdminRole(role: unknown): boolean {
    return roleSatisfies(role, ADMIN_ONLY_ROLES);
}

export function isManagerRole(role: unknown): boolean {
    return roleSatisfies(role, MANAGER_ROLES);
}

export function normalizeRoleLabel(role: unknown): string {
    const normalized = normalizeStoredRole(role);
    switch (normalized) {
        case "admin":
            return "Admin";
        case "supervisor":
            return "Supervisor";
        case "technician":
            return "Technician";
        default:
            return String(role || "Unknown");
    }
}

