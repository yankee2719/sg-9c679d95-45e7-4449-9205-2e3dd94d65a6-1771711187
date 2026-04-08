import type { Constants } from "@/integrations/supabase/database.types";

export type CanonicalOrgRole = (typeof Constants.public.Enums.org_role)[number];
export type AppRole = CanonicalOrgRole | "owner" | "plant_manager" | "viewer" | "operator";

const ROLE_ALIAS_MAP: Record<string, CanonicalOrgRole> = {
    owner: "admin",
    admin: "admin",
    plant_manager: "supervisor",
    supervisor: "supervisor",
    technician: "technician",
    viewer: "technician",
    operator: "technician",
};

const ROLE_RANK: Record<CanonicalOrgRole, number> = {
    admin: 3,
    supervisor: 2,
    technician: 1,
};

export function normalizeAppRole(value: unknown): CanonicalOrgRole | null {
    const key = String(value ?? "").trim().toLowerCase();
    return ROLE_ALIAS_MAP[key] ?? null;
}

export function isCanonicalOrgRole(value: unknown): value is CanonicalOrgRole {
    return normalizeAppRole(value) === value;
}

export function normalizeRoleForWrite(value: unknown): CanonicalOrgRole | null {
    const key = String(value ?? "").trim().toLowerCase();
    if (key === "admin" || key === "supervisor" || key === "technician") {
        return key;
    }
    return null;
}

export function isAdminRole(value: unknown): boolean {
    return normalizeAppRole(value) === "admin";
}

export function isSupervisorOrAbove(value: unknown): boolean {
    const role = normalizeAppRole(value);
    return role === "admin" || role === "supervisor";
}

export function canManageMembers(value: unknown): boolean {
    return normalizeAppRole(value) === "admin";
}

export function canManageMachines(value: unknown): boolean {
    const role = normalizeAppRole(value);
    return role === "admin" || role === "supervisor";
}

export function canExecuteWorkOrders(value: unknown): boolean {
    return normalizeAppRole(value) !== null;
}

export function hasMinimumCanonicalRole(actual: unknown, required: CanonicalOrgRole): boolean {
    const actualRole = normalizeAppRole(actual);
    return actualRole ? ROLE_RANK[actualRole] >= ROLE_RANK[required] : false;
}

export function getRoleLabel(value: unknown): string {
    switch (normalizeAppRole(value)) {
        case "admin":
            return "Admin";
        case "supervisor":
            return "Supervisor";
        case "technician":
            return "Technician";
        default:
            return String(value ?? "Unknown");
    }
}

