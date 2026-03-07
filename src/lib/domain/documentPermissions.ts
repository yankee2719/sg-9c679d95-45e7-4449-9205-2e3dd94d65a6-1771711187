// src/lib/domain/documentPermissions.ts
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";

export type DocumentScope = "manufacturer" | "customer";

export interface DocumentPermissionResult {
    canRead: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canUploadVersion: boolean;
    canSign: boolean;
    reason?: string | null;
}

async function getMachineOrganization(machineId: string | null | undefined) {
    if (!machineId) return null;

    const { data, error } = await supabase
        .from("machines")
        .select("id, organization_id")
        .eq("id", machineId)
        .maybeSingle();

    if (error) throw error;
    return data as { id: string; organization_id: string | null } | null;
}

async function isManufacturerAssignedToMachine(machineId: string, manufacturerOrgId: string) {
    const { data, error } = await supabase
        .from("machine_assignments")
        .select("machine_id")
        .eq("machine_id", machineId)
        .eq("manufacturer_org_id", manufacturerOrgId)
        .eq("is_active", true)
        .limit(1);

    if (error) throw error;
    return (data ?? []).length > 0;
}

export async function getDocumentPermissions(args: {
    machineId?: string | null;
    scope: DocumentScope;
    createdByOrgId?: string | null;
}): Promise<DocumentPermissionResult> {
    const ctx = await getUserContext();
    if (!ctx?.orgId || !ctx.orgType) {
        return {
            canRead: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canUploadVersion: false,
            canSign: false,
            reason: "Contesto utente non valido.",
        };
    }

    const machine = await getMachineOrganization(args.machineId);
    const isMachineOwner = !!machine && machine.organization_id === ctx.orgId;
    const isManufacturerAssigned =
        !!args.machineId &&
        ctx.orgType === "manufacturer" &&
        (await isManufacturerAssignedToMachine(args.machineId, ctx.orgId));

    const isCreatorOrg = !!args.createdByOrgId && args.createdByOrgId === ctx.orgId;
    const canAdminLike = ctx.role === "admin" || ctx.role === "supervisor";

    if (args.scope === "manufacturer") {
        if (ctx.orgType === "manufacturer") {
            const canManage = canAdminLike && (isCreatorOrg || isManufacturerAssigned || isMachineOwner);
            return {
                canRead: isCreatorOrg || isManufacturerAssigned || isMachineOwner,
                canCreate: canAdminLike,
                canEdit: canManage,
                canDelete: canManage,
                canUploadVersion: canManage,
                canSign: canManage,
                reason: canManage ? null : "Documento costruttore gestibile solo dall'organizzazione costruttrice.",
            };
        }

        return {
            canRead: isMachineOwner,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canUploadVersion: false,
            canSign: false,
            reason: "Il cliente finale può solo consultare i documenti costruttore.",
        };
    }

    // scope === customer
    if (ctx.orgType === "customer") {
        const canManage = isMachineOwner && (canAdminLike || ctx.role === "technician");
        return {
            canRead: isMachineOwner,
            canCreate: canManage,
            canEdit: canManage,
            canDelete: canAdminLike && isMachineOwner,
            canUploadVersion: canManage,
            canSign: canAdminLike && isMachineOwner,
            reason: canManage ? null : "Documento operativo cliente gestibile solo dall'organizzazione proprietaria.",
        };
    }

    return {
        canRead: isManufacturerAssigned || isCreatorOrg,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canUploadVersion: false,
        canSign: false,
        reason: "Il costruttore non modifica i documenti operativi del cliente.",
    };
}
