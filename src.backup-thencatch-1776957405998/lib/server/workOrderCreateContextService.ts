import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "@/lib/apiAuth";
import { getAccessibleMachineIds } from "@/lib/server/customerVisibility";

type ApiUser = AuthenticatedRequest["user"];

export interface WorkOrderCreateContextMachine {
    id: string;
    name: string;
    internal_code: string | null;
    plant_id: string | null;
}

export interface WorkOrderCreateContextAssignee {
    id: string;
    display_name: string;
    email: string | null;
}

function normalizeDisplayName(row: any) {
    const display = String(row?.display_name ?? "").trim();
    if (display) return display;

    const first = String(row?.first_name ?? "").trim();
    const last = String(row?.last_name ?? "").trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;

    return row?.email ?? row?.id ?? "Utente";
}

export async function getWorkOrderCreateContext(
    supabase: SupabaseClient,
    user: ApiUser
): Promise<{
    machines: WorkOrderCreateContextMachine[];
    assignees: WorkOrderCreateContextAssignee[];
}> {
    if (!user.organizationId) {
        throw new Error("Active organization not found.");
    }

    const machineIds = await getAccessibleMachineIds(supabase, user);

    let machines: WorkOrderCreateContextMachine[] = [];
    if (machineIds.length > 0) {
        const { data, error } = await supabase
            .from("machines")
            .select("id, name, internal_code, plant_id")
            .in("id", machineIds)
            .eq("is_archived", false)
            .or("is_deleted.is.null,is_deleted.eq.false")
            .order("name", { ascending: true });

        if (error) throw error;
        machines = ((data ?? []) as any[]).map((row) => ({
            id: row.id,
            name: row.name ?? "—",
            internal_code: row.internal_code ?? null,
            plant_id: row.plant_id ?? null,
        }));
    }

    const { data: memberships, error: membershipsError } = await supabase
        .from("organization_memberships")
        .select("user_id")
        .eq("organization_id", user.organizationId)
        .eq("is_active", true);

    if (membershipsError) throw membershipsError;

    const userIds = Array.from(new Set((memberships ?? []).map((row: any) => row.user_id).filter(Boolean)));

    let assignees: WorkOrderCreateContextAssignee[] = [];
    if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, display_name, first_name, last_name, email")
            .in("id", userIds)
            .order("display_name", { ascending: true });

        if (profilesError) throw profilesError;
        assignees = ((profiles ?? []) as any[]).map((row) => ({
            id: row.id,
            display_name: normalizeDisplayName(row),
            email: row.email ?? null,
        }));
    }

    return { machines, assignees };
}
