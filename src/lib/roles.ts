export const REAL_ORG_ROLES = ["admin", "supervisor", "technician"] as const;
export const LEGACY_ORG_ROLES = ["owner", "plant_manager", "viewer", "operator"] as const;

export type WritableOrgRole = (typeof REAL_ORG_ROLES)[number];
export type LegacyOrgRole = (typeof LEGACY_ORG_ROLES)[number];
export type AppRole = WritableOrgRole;
export type AnyRole = AppRole | LegacyOrgRole | string;

const ROLE_ORDER: Record<AppRole, number> = {
  technician: 10,
  supervisor: 20,
  admin: 30,
};

export function isWritableOrgRole(value: unknown): value is WritableOrgRole {
  return typeof value === "string" && (REAL_ORG_ROLES as readonly string[]).includes(value);
}

export function isLegacyOrgRole(value: unknown): value is LegacyOrgRole {
  return typeof value === "string" && (LEGACY_ORG_ROLES as readonly string[]).includes(value);
}

export function normalizeRole(value: unknown): AppRole {
  const raw = String(value ?? "").trim().toLowerCase();

  if (raw === "admin") return "admin";
  if (raw === "supervisor") return "supervisor";
  if (raw === "technician") return "technician";

  if (raw === "owner") return "admin";
  if (raw === "plant_manager") return "supervisor";
  if (raw === "viewer") return "technician";
  if (raw === "operator") return "technician";

  return "technician";
}

export function toWritableOrgRole(value: unknown): WritableOrgRole {
  return normalizeRole(value);
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

export function isAdminRole(value: unknown): boolean {
  return normalizeRole(value) === "admin";
}

export function isSupervisorRole(value: unknown): boolean {
  const role = normalizeRole(value);
  return role === "admin" || role === "supervisor";
}

export function isTechnicianRole(value: unknown): boolean {
  return normalizeRole(value) === "technician";
}

export function isViewOnlyRole(value: unknown): boolean {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "viewer") return true;
  return false;
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

export function canEditDocuments(value: unknown): boolean {
  return hasMinimumRole(value as string, "supervisor");
}

export function canExecuteWorkOrders(value: unknown): boolean {
  return hasMinimumRole(value as string, "technician");
}

export function canManageChecklists(value: unknown): boolean {
  return hasMinimumRole(value as string, "supervisor");
}

export function canManagePlants(value: unknown): boolean {
  return hasMinimumRole(value as string, "supervisor");
}

export function canManageCustomers(value: unknown): boolean {
  return hasMinimumRole(value as string, "supervisor");
}

export function canManageAssignments(value: unknown): boolean {
  return hasMinimumRole(value as string, "supervisor");
}

export function canManageBilling(value: unknown): boolean {
  return hasMinimumRole(value as string, "admin");
}

export function canViewAdminArea(value: unknown): boolean {
  return hasMinimumRole(value as string, "admin");
}

export function roleLabel(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();

  if (raw === "owner") return "Admin";
  if (raw === "plant_manager") return "Supervisor";
  if (raw === "viewer") return "Technician";
  if (raw === "operator") return "Technician";

  const role = normalizeRole(value);
  if (role === "admin") return "Admin";
  if (role === "supervisor") return "Supervisor";
  return "Technician";
}