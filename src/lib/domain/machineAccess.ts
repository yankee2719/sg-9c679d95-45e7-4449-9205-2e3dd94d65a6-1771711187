// src/lib/domain/machineAccess.ts
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";

export type ActiveOrgType = "manufacturer" | "customer" | "enterprise" | "enterprise";

export interface MachineAccessContext {
    userId: string;
    orgId: string;
    orgType: ActiveOrgType;
    role: string;
}

export interface MachineVisibility {
    machineId: string;
    isOwner: boolean;
    isAssignedCustomer: boolean;
    isAssignedManufacturer: boolean;
    canView: boolean;
    canEditOperationalData: boolean;
    canManageManufacturerData: boolean;
    canArchive: boolean;
}

async function resolveMachine(machineId: string) {
    const { data, error } = await supabase
        .from("machines")
        .select("id, organization_id, is_archived")
        .eq("id", machineId)
        .maybeSingle();

    if (error) throw error;
    return data as { id: string; organization_id: string | null; is_archived?: boolean } | null;
}

async function resolveAssignments(machineId: string) {
    const { data, error } = await supabase
        .from("machine_assignments")
        .select("manufacturer_org_id, customer_org_id, is_active")
        .eq("machine_id", machineId)
        .eq("is_active", true);

    if (error) throw error;
    return (data ?? []) as Array<{
        manufacturer_org_id: string | null;
        customer_org_id: string | null;
        is_active: boolean;
    }>;
}

export async function getActiveMachineAccessContext(): Promise<MachineAccessContext | null> {
    const ctx = await getUserContext();
    if (!ctx?.orgId || !ctx.orgType) return null;

    return {
        userId: ctx.userId,
        orgId: ctx.orgId,
        orgType: ctx.orgType,
        role: ctx.role,
    };
}

export async function getMachineVisibility(machineId: string): Promise<MachineVisibility | null> {
    const ctx = await getActiveMachineAccessContext();
    if (!ctx) return null;

    const machine = await resolveMachine(machineId);
    if (!machine) return null;

    const assignments = await resolveAssignments(machineId);

    const isOwner = machine.organization_id === ctx.orgId;
    const isAssignedCustomer = assignments.some((a) => a.customer_org_id === ctx.orgId);
    const isAssignedManufacturer = assignments.some((a) => a.manufacturer_org_id === ctx.orgId);

    const canView = isOwner || isAssignedCustomer || isAssignedManufacturer;

    const canEditOperationalData =
        (ctx.orgType === "customer" || ctx.orgType === "enterprise") && isOwner && (ctx.role === "admin" || ctx.role === "supervisor" || ctx.role === "technician");

    const canManageManufacturerData =
        ctx.orgType === "manufacturer" &&
        (isAssignedManufacturer || isOwner) &&
        (ctx.role === "admin" || ctx.role === "supervisor");

    const canArchive =
        (ctx.role === "admin" || ctx.role === "supervisor") &&
        isOwner &&
        !assignments.some((a) => a.customer_org_id);

    return {
        machineId,
        isOwner,
        isAssignedCustomer,
        isAssignedManufacturer,
        canView,
        canEditOperationalData,
        canManageManufacturerData,
        canArchive,
    };
}

export async function assertCanViewMachine(machineId: string) {
    const visibility = await getMachineVisibility(machineId);
    if (!visibility?.canView) {
        throw new Error("Accesso negato alla macchina richiesta.");
    }
    return visibility;
}

export async function assertCanEditOperationalMachineData(machineId: string) {
    const visibility = await getMachineVisibility(machineId);
    if (!visibility?.canEditOperationalData) {
        throw new Error("Non puoi modificare i dati operativi di questa macchina.");
    }
    return visibility;
}

export async function assertCanManageManufacturerMachineData(machineId: string) {
    const visibility = await getMachineVisibility(machineId);
    if (!visibility?.canManageManufacturerData) {
        throw new Error("Non puoi gestire i dati costruttore di questa macchina.");
    }
    return visibility;
}
