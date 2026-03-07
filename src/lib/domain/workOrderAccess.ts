// src/lib/domain/workOrderAccess.ts
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";

export interface WorkOrderAccess {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canAssign: boolean;
    canExecute: boolean;
    canClose: boolean;
    reason?: string | null;
}

async function getMachineOwnerOrg(machineId: string) {
    const { data, error } = await supabase
        .from("machines")
        .select("organization_id")
        .eq("id", machineId)
        .maybeSingle();

    if (error) throw error;
    return (data as any)?.organization_id ?? null;
}

export async function getWorkOrderAccess(machineId: string): Promise<WorkOrderAccess> {
    const ctx = await getUserContext();

    if (!ctx?.orgId || !ctx.orgType) {
        return {
            canView: false,
            canCreate: false,
            canEdit: false,
            canAssign: false,
            canExecute: false,
            canClose: false,
            reason: "Contesto utente non valido.",
        };
    }

    const ownerOrgId = await getMachineOwnerOrg(machineId);
    const isOwnerOrg = ownerOrgId === ctx.orgId;
    const isAdmin = ctx.role === "admin";
    const isSupervisor = ctx.role === "supervisor";
    const isTechnician = ctx.role === "technician";

    if (ctx.orgType !== "customer") {
        return {
            canView: false,
            canCreate: false,
            canEdit: false,
            canAssign: false,
            canExecute: false,
            canClose: false,
            reason: "I work order operativi sono gestiti solo dall'organizzazione proprietaria cliente.",
        };
    }

    if (!isOwnerOrg) {
        return {
            canView: false,
            canCreate: false,
            canEdit: false,
            canAssign: false,
            canExecute: false,
            canClose: false,
            reason: "Puoi operare solo sulle macchine possedute dalla tua organizzazione.",
        };
    }

    return {
        canView: true,
        canCreate: isAdmin || isSupervisor,
        canEdit: isAdmin || isSupervisor,
        canAssign: isAdmin || isSupervisor,
        canExecute: isAdmin || isSupervisor || isTechnician,
        canClose: isAdmin || isSupervisor,
        reason: null,
    };
}
