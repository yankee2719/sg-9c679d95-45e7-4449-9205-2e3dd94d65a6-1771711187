export type StoredOrgRole = "admin" | "supervisor" | "technician";
export type LegacyOrgRoleAlias = "owner" | "plant_manager" | "viewer";
export type CompatibleOrgRole = StoredOrgRole | LegacyOrgRoleAlias;

export const STORED_ORG_ROLES: StoredOrgRole[] = ["admin", "supervisor", "technician"];
export const LEGACY_ORG_ROLE_ALIASES: LegacyOrgRoleAlias[] = ["owner", "plant_manager", "viewer"];
export const COMPATIBLE_ORG_ROLES: CompatibleOrgRole[] = [
    ...STORED_ORG_ROLES,
    ...LEGACY_ORG_ROLE_ALIASES,
];

const ROLE_RANK: Record<CompatibleOrgRole, number> = {
    viewer: 0,
    technician: 1,
    plant_manager: 2,
    supervisor: 2,
    owner: 3,
    admin: 3,
};

export function normalizeCompatibleRole(value: unknown): CompatibleOrgRole | null {
    const raw = String(value ?? "").trim().toLowerCase();
    if ((COMPATIBLE_ORG_ROLES as string[]).includes(raw)) {
        return raw as CompatibleOrgRole;
    }
    return null;
}

export function normalizeRoleForStorage(value: unknown): StoredOrgRole | null {
    const normalized = normalizeCompatibleRole(value);
    if (!normalized) return null;

    switch (normalized) {
        case "owner":
            return "admin";
        case "plant_manager":
            return "supervisor";
        case "viewer":
            return null;
        default:
            return normalized;
    }
}

export function hasMinimumCompatibleRole(
    actualRole: unknown,
    requiredRole: CompatibleOrgRole
): boolean {
    const actual = normalizeCompatibleRole(actualRole);
    return !!actual && ROLE_RANK[actual] >= ROLE_RANK[requiredRole];
}

export function roleSatisfiesAny(
    actualRole: unknown,
    allowedRoles: readonly CompatibleOrgRole[]
): boolean {
    const actual = normalizeCompatibleRole(actualRole);
    if (!actual) return false;
    return allowedRoles.some((allowedRole) => ROLE_RANK[actual] >= ROLE_RANK[allowedRole]);
}

export function isManagementRole(role: unknown): boolean {
    return hasMinimumCompatibleRole(role, "supervisor");
}

export function isAdminLikeRole(role: unknown): boolean {
    return hasMinimumCompatibleRole(role, "admin");
}

export function getRoleLabel(role: unknown): string {
    const normalized = normalizeCompatibleRole(role);
    switch (normalized) {
        case "owner":
            return "Owner";
        case "admin":
            return "Admin";
        case "plant_manager":
            return "Plant manager";
        case "supervisor":
            return "Supervisor";
        case "technician":
            return "Technician";
        case "viewer":
            return "Viewer";
        default:
            return String(role || "Unknown");
    }
}
