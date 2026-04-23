// src/hooks/usePermissions.ts
// ============================================================================
// Centralized Permission System — Manufacturer vs Customer + Role-based
// ============================================================================
//
// ORG TYPES:
//   manufacturer — builds machines, assigns to customers, manages docs/compliance
//   customer     — operates machines, does maintenance, executes checklists
//
// ROLES (within org):
//   admin      — full control within org scope
//   supervisor — manage operations, approve WOs, view analytics
//   technician — execute WOs, checklists, log events
//
// ============================================================================

import { useMemo } from "react";

export type OrgType = "manufacturer" | "customer" | null;
export type UserRole = "admin" | "supervisor" | "technician";

interface PermissionsInput {
    role: string;
    orgType: OrgType;
}

export interface Permissions {
    // Identity
    orgType: OrgType;
    role: UserRole;
    isManufacturer: boolean;
    isCustomer: boolean;
    isAdmin: boolean;
    isSupervisor: boolean;
    isTechnician: boolean;
    isAdminOrSupervisor: boolean;

    // Equipment
    canCreateEquipment: boolean;      // manufacturer creates, customer only if not assigned
    canEditEquipment: boolean;        // admin/supervisor of owning org
    canDeleteEquipment: boolean;      // admin only of owning org
    canViewEquipment: boolean;        // everyone in the org
    canAssignEquipment: boolean;      // manufacturer admin/supervisor only

    // Maintenance Plans
    canCreatePlan: boolean;           // admin/supervisor
    canEditPlan: boolean;             // admin/supervisor
    canDeletePlan: boolean;           // admin only
    canViewPlans: boolean;            // everyone

    // Work Orders
    canCreateWO: boolean;             // admin/supervisor
    canEditWO: boolean;               // admin/supervisor, or technician if assigned
    canDeleteWO: boolean;             // admin only
    canApproveWO: boolean;            // admin/supervisor
    canAssignWO: boolean;             // admin/supervisor
    canTransitionWO: boolean;         // admin/supervisor, or technician if assigned
    canViewWOs: boolean;              // everyone

    // Checklists
    canCreateChecklist: boolean;      // admin/supervisor
    canEditChecklist: boolean;        // admin/supervisor
    canExecuteChecklist: boolean;     // everyone (technicians execute)
    canViewChecklists: boolean;       // everyone

    // Documents
    canUploadDocuments: boolean;      // admin/supervisor (manufacturer: full docs, customer: operational)
    canDeleteDocuments: boolean;      // admin only
    canViewDocuments: boolean;        // everyone

    // Compliance
    canViewCompliance: boolean;       // admin/supervisor
    canManageCompliance: boolean;     // manufacturer admin/supervisor
    canGrantInspectorAccess: boolean; // admin only

    // Admin
    canManageUsers: boolean;          // admin only
    canManagePlants: boolean;         // customer admin
    canManageCustomers: boolean;      // manufacturer admin/supervisor
    canViewAnalytics: boolean;        // admin/supervisor

    // Notifications
    canSendNotifications: boolean;    // admin only

    // Helpers
    canEditIfOwner: (ownerOrgId: string | null, userOrgId: string | null) => boolean;
    canEditWOIfAssigned: (assignedTo: string | null, userId: string) => boolean;
}

export function usePermissions(input: PermissionsInput): Permissions {
    return useMemo(() => buildPermissions(input), [input.role, input.orgType]);
}

// Also export a non-hook version for use in callbacks/effects
export function getPermissions(input: PermissionsInput): Permissions {
    return buildPermissions(input);
}

function buildPermissions({ role, orgType }: PermissionsInput): Permissions {
    const r = (role || "technician") as UserRole;
    const isManufacturer = orgType === "manufacturer";
    const isCustomer = orgType === "customer";
    const isAdmin = r === "admin";
    const isSupervisor = r === "supervisor";
    const isTechnician = r === "technician";
    const isAdminOrSupervisor = isAdmin || isSupervisor;

    return {
        // Identity
        orgType,
        role: r,
        isManufacturer,
        isCustomer,
        isAdmin,
        isSupervisor,
        isTechnician,
        isAdminOrSupervisor,

        // Equipment
        canCreateEquipment: isAdminOrSupervisor,
        canEditEquipment: isAdminOrSupervisor,
        canDeleteEquipment: isAdmin,
        canViewEquipment: true,
        canAssignEquipment: isManufacturer && isAdminOrSupervisor,

        // Maintenance Plans
        canCreatePlan: isAdminOrSupervisor,
        canEditPlan: isAdminOrSupervisor,
        canDeletePlan: isAdmin,
        canViewPlans: true,

        // Work Orders
        canCreateWO: isAdminOrSupervisor,
        canEditWO: isAdminOrSupervisor, // technicians checked per-WO via canEditWOIfAssigned
        canDeleteWO: isAdmin,
        canApproveWO: isAdminOrSupervisor,
        canAssignWO: isAdminOrSupervisor,
        canTransitionWO: true, // all can transition (technicians only their own via RLS)
        canViewWOs: true,

        // Checklists
        canCreateChecklist: isAdminOrSupervisor,
        canEditChecklist: isAdminOrSupervisor,
        canExecuteChecklist: true,
        canViewChecklists: true,

        // Documents
        canUploadDocuments: isAdminOrSupervisor,
        canDeleteDocuments: isAdmin,
        canViewDocuments: true,

        // Compliance
        canViewCompliance: isAdminOrSupervisor,
        canManageCompliance: isManufacturer && isAdminOrSupervisor,
        canGrantInspectorAccess: isAdmin,

        // Admin
        canManageUsers: isAdmin,
        canManagePlants: isCustomer && isAdmin,
        canManageCustomers: isManufacturer && isAdminOrSupervisor,
        canViewAnalytics: isAdminOrSupervisor,

        // Notifications
        canSendNotifications: isAdmin,

        // Helpers
        canEditIfOwner: (ownerOrgId, userOrgId) => {
            if (!ownerOrgId || !userOrgId) return isAdminOrSupervisor;
            return ownerOrgId === userOrgId && isAdminOrSupervisor;
        },
        canEditWOIfAssigned: (assignedTo, userId) => {
            if (isAdminOrSupervisor) return true;
            return isTechnician && assignedTo === userId;
        },
    };
}

