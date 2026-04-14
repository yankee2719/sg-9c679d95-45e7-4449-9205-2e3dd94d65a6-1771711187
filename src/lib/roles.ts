export const APP_ROLE_VALUES = ["admin", "supervisor", "technician"] as const;
export const REAL_ORG_ROLES = APP_ROLE_VALUES;
export const LEGACY_ORG_ROLES = ["owner", "plant_manager", "viewer", "operator"] as const;

export type WritableOrgRole = (typeof APP_ROLE_VALUES)[number];
export type LegacyOrgRole = (typeof LEGACY_ORG_ROLES)[number];
export type AppRole = WritableOrgRole;
export type AnyRole = AppRole | LegacyOrgRole | string;
export type DatabaseOrgRole = WritableOrgRole;

export const DEFAULT_APP_ROLE: AppRole = "technician";

export const ROLE_LABELS: Record<AppRole, string> = {
    admin: "Admin",
    supervisor: "Supervisor",
    technician: "Technician",
};

export const ALL_APP_ROLES = [...APP_ROLE_VALUES] as const;
export const ADMIN_ONLY_ROLES = ["admin"] as const;
export const MANAGER_ROLES = ["admin", "supervisor"] as const;

const ROLE_ORDER: Record<AppRole, number> = {
    technician: 10,
    supervisor: 20,
    admin: 30,
};

function toRawRole(value: unknown): string {
    return String(value ?? "").trim().toLowerCase();
}

function resolveFallbackRole(fallback: AnyRole | undefined): AppRole {
    const raw = toRawRole(fallback);

    if (raw === "admin") return "admin";
    if (raw === "supervisor") return "supervisor";
    if (raw === "owner") return "admin";
    if (raw === "plant_manager") return "supervisor";

    return DEFAULT_APP_ROLE;
}

export function isWritableOrgRole(value: unknown): value is WritableOrgRole {
    return typeof value === "string" && (APP_ROLE_VALUES as readonly string[]).includes(value);
}

export function isLegacyOrgRole(value: unknown): value is LegacyOrgRole {
    return typeof value === "string" && (LEGACY_ORG_ROLES as readonly string[]).includes(value);
}

export function normalizeRole(value: unknown, fallback: AnyRole = DEFAULT_APP_ROLE): AppRole {
    const raw = toRawRole(value);

    if (raw === "admin") return "admin";
    if (raw === "supervisor") return "supervisor";
    if (raw === "technician") return "technician";

    // legacy compatibility
    if (raw === "owner") return "admin";
    if (raw === "plant_manager") return "supervisor";
    if (raw === "viewer") return "technician";
    if (raw === "operator") return "technician";

    return resolveFallbackRole(fallback);
}

export function toWritableOrgRole(value: unknown, fallback: AnyRole = DEFAULT_APP_ROLE): WritableOrgRole {
    return normalizeRole(value, fallback);
}

export function normalizeRoleForStorage(
    value: unknown,
    fallback: AnyRole = DEFAULT_APP_ROLE
): WritableOrgRole {
    return toWritableOrgRole(value, fallback);
}

export function getRoleRank(value: unknown): number {
    return ROLE_ORDER[normalizeRole(value)];
}

export function hasMinimumRole(
    userRole: AppRole | string | null | undefined,
    requiredRole: AppRole
): boolean {
    return getRoleRank(userRole) >= getRoleRank(requiredRole);
}

export function hasMinimumCompatibleRole(
    userRole: AppRole | string | null | undefined,
    requiredRole: AppRole
): boolean {
    return hasMinimumRole(userRole, requiredRole);
}

export function hasMinimumOrgRole(
    userRole: AppRole | string | null | undefined,
    requiredRole: AppRole
): boolean {
    return hasMinimumCompatibleRole(userRole, requiredRole);
}

export function roleSatisfiesAny(
    userRole: AppRole | string | null | undefined,
    allowedRoles: readonly (AppRole | string)[]
): boolean {
    const normalizedUserRole = normalizeRole(userRole);
    return allowedRoles.some((role) => normalizeRole(role) === normalizedUserRole);
}

export function isAdminRole(value: unknown): boolean {
    return normalizeRole(value) === "admin";
}

export function isSupervisorRole(value: unknown): boolean {
    const role = normalizeRole(value);
    return role === "admin" || role === "supervisor";
}

export function isManagerRole(value: unknown): boolean {
    return isSupervisorRole(value);
}

export function isTechnicianRole(value: unknown): boolean {
    return normalizeRole(value) === "technician";
}

export function isOperatorRole(value: unknown): boolean {
    return toRawRole(value) === "operator" || normalizeRole(value) === "technician";
}

export function isViewOnlyRole(value: unknown): boolean {
    return toRawRole(value) === "viewer";
}

export function canManageUsers(value: unknown): boolean {
    return hasMinimumRole(value as string, "admin");
}

export function canManageMembers(value: unknown): boolean {
    return canManageUsers(value);
}

export function canManageMachines(value: unknown): boolean {
    return hasMinimumRole(value as string, "supervisor");
}

export function canViewMachines(value: unknown): boolean {
    return hasMinimumRole(value as string, "technician");
}

export function canManageWorkOrders(value: unknown): boolean {
    return hasMinimumRole(value as string, "supervisor");
}

export function canViewWorkOrders(value: unknown): boolean {
    return hasMinimumRole(value as string, "technician");
}

export function canCreateWorkOrders(value: unknown): boolean {
    return hasMinimumRole(value as string, "supervisor");
}

export function canEditWorkOrders(value: unknown): boolean {
    return hasMinimumRole(value as string, "supervisor");
}

export function canDeleteWorkOrders(value: unknown): boolean {
    return hasMinimumRole(value as string, "admin");
}

export function canExecuteWorkOrders(value: unknown): boolean {
    return hasMinimumRole(value as string, "technician");
}

export function canManageChecklists(value: unknown): boolean {
    return hasMinimumRole(value as string, "supervisor");
}

export function canViewChecklists(value: unknown): boolean {
    return hasMinimumRole(value as string, "technician");
}

export function canExecuteChecklists(value: unknown): boolean {
    return hasMinimumRole(value as string, "technician");
}

export function canEditDocuments(value: unknown): boolean {
    return hasMinimumRole(value as string, "supervisor");
}

export function canViewDocuments(value: unknown): boolean {
    return hasMinimumRole(value as string, "technician");
}

export function canManagePlants(value: unknown): boolean {
    return hasMinimumRole(value as string, "supervisor");
}

export function canViewPlants(value: unknown): boolean {
    return hasMinimumRole(value as string, "technician");
}

export function canEditPlants(value: unknown): boolean {
    return hasMinimumRole(value as string, "supervisor");
}

export function canManageCustomers(value: unknown): boolean {
    return hasMinimumRole(value as string, "supervisor");
}

export function canViewCustomers(value: unknown): boolean {
    return hasMinimumRole(value as string, "technician");
}

export function canManageAssignments(value: unknown): boolean {
    return hasMinimumRole(value as string, "supervisor");
}

export function canViewAssignments(value: unknown): boolean {
    return hasMinimumRole(value as string, "technician");
}

export function canManageBilling(value: unknown): boolean {
    return hasMinimumRole(value as string, "admin");
}

export function canViewAdminArea(value: unknown): boolean {
    return hasMinimumRole(value as string, "admin");
}

export function canAccessAdminArea(value: unknown): boolean {
    return canViewAdminArea(value);
}

export function roleLabel(value: unknown): string {
    return ROLE_LABELS[normalizeRole(value)];
}

export function getRoleBadgeLabel(value: unknown): string {
    return roleLabel(value);
}
