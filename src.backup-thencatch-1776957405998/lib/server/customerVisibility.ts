import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "@/lib/apiAuth";

type ApiUser = AuthenticatedRequest["user"];

type MachineRow = {
    id: string;
    organization_id: string | null;
    is_archived?: boolean | null;
    is_deleted?: boolean | null;
};

export async function getAccessibleMachineIds(
    supabase: SupabaseClient,
    user: ApiUser
): Promise<string[]> {
    if (!user.organizationId) return [];

    if (user.organizationType === "manufacturer") {
        const { data, error } = await supabase
            .from("machines")
            .select("id")
            .eq("organization_id", user.organizationId)
            .eq("is_archived", false)
            .or("is_deleted.is.null,is_deleted.eq.false");

        if (error) throw error;
        return Array.from(new Set((data ?? []).map((row: any) => row.id).filter(Boolean)));
    }

    const [{ data: ownMachines, error: ownError }, { data: assignments, error: assignmentsError }] =
        await Promise.all([
            supabase
                .from("machines")
                .select("id")
                .eq("organization_id", user.organizationId)
                .eq("is_archived", false)
                .or("is_deleted.is.null,is_deleted.eq.false"),
            supabase
                .from("machine_assignments")
                .select("machine_id")
                .eq("customer_org_id", user.organizationId)
                .eq("is_active", true),
        ]);

    if (ownError) throw ownError;
    if (assignmentsError) throw assignmentsError;

    return Array.from(
        new Set([
            ...(ownMachines ?? []).map((row: any) => row.id),
            ...(assignments ?? []).map((row: any) => row.machine_id),
        ].filter(Boolean))
    );
}

export async function assertCanReferenceMachine(
    supabase: SupabaseClient,
    user: ApiUser,
    machineId: string
): Promise<MachineRow> {
    const { data: machine, error } = await supabase
        .from("machines")
        .select("id, organization_id, is_archived, is_deleted")
        .eq("id", machineId)
        .maybeSingle();

    if (error) throw error;
    if (!machine) throw new Error("Machine not found.");
    if ((machine as any).is_archived) throw new Error("Machine is archived.");
    if ((machine as any).is_deleted === true) throw new Error("Machine is deleted.");

    if (!user.organizationId) {
        throw new Error("Active organization not found.");
    }

    if (user.organizationType === "manufacturer") {
        if ((machine as any).organization_id !== user.organizationId) {
            throw new Error("Manufacturers can create work orders only for their own machines.");
        }
        return machine as MachineRow;
    }

    if ((machine as any).organization_id === user.organizationId) {
        return machine as MachineRow;
    }

    const { data: assignment, error: assignmentError } = await supabase
        .from("machine_assignments")
        .select("id")
        .eq("machine_id", machineId)
        .eq("customer_org_id", user.organizationId)
        .eq("is_active", true)
        .maybeSingle();

    if (assignmentError) throw assignmentError;
    if (!assignment) {
        throw new Error("Machine is not assigned to the active customer organization.");
    }

    return machine as MachineRow;
}

export async function getAccessibleMachineContextMap(
    supabase: SupabaseClient,
    user: ApiUser
): Promise<Map<string, { name: string | null; internal_code: string | null }>> {
    const machineIds = await getAccessibleMachineIds(supabase, user);
    if (machineIds.length === 0) return new Map();

    const { data, error } = await supabase
        .from("machines")
        .select("id, name, internal_code")
        .in("id", machineIds);

    if (error) throw error;

    return new Map(
        (data ?? []).map((row: any) => [
            row.id,
            { name: row.name ?? null, internal_code: row.internal_code ?? null },
        ])
    );
}

