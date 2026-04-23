import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "@/lib/apiAuth";
import { getAccessibleMachineIds } from "@/lib/server/customerVisibility";

type ApiUser = AuthenticatedRequest["user"];

export interface MaintenanceOverviewItem {
    id: string;
    title: string | null;
    machine_id: string | null;
    machine_name: string | null;
    due_date: string | null;
    priority: string | null;
    status: string | null;
    created_at: string | null;
}

export async function getMaintenanceOverview(
    supabase: SupabaseClient,
    user: ApiUser
): Promise<{ items: MaintenanceOverviewItem[] }> {
    if (!user.organizationId) {
        throw new Error("Active organization not found.");
    }

    const selectClause = `
        id,
        title,
        machine_id,
        due_date,
        priority,
        status,
        created_at,
        work_type,
        organization_id
    `;

    let rows: any[] = [];

    if (user.organizationType === "manufacturer") {
        const { data, error } = await supabase
            .from("work_orders")
            .select(selectClause)
            .eq("organization_id", user.organizationId)
            .eq("work_type", "preventive")
            .order("created_at", { ascending: false });

        if (error) throw error;
        rows = (data ?? []) as any[];
    } else {
        const accessibleMachineIds = await getAccessibleMachineIds(supabase, user);

        const [ownRowsRes, linkedRowsRes] = await Promise.all([
            supabase
                .from("work_orders")
                .select(selectClause)
                .eq("organization_id", user.organizationId)
                .eq("work_type", "preventive")
                .order("created_at", { ascending: false }),
            accessibleMachineIds.length > 0
                ? supabase
                    .from("work_orders")
                    .select(selectClause)
                    .in("machine_id", accessibleMachineIds)
                    .eq("work_type", "preventive")
                    .order("created_at", { ascending: false })
                : Promise.resolve({ data: [], error: null } as any),
        ]);

        if (ownRowsRes.error) throw ownRowsRes.error;
        if (linkedRowsRes.error) throw linkedRowsRes.error;

        const merged = new Map<string, any>();
        for (const row of ownRowsRes.data ?? []) merged.set(row.id, row);
        for (const row of linkedRowsRes.data ?? []) merged.set(row.id, row);
        rows = Array.from(merged.values()).sort((a, b) => {
            const da = a.created_at ? new Date(a.created_at).getTime() : 0;
            const db = b.created_at ? new Date(b.created_at).getTime() : 0;
            return db - da;
        });
    }

    const machineIds = Array.from(new Set(rows.map((row) => row.machine_id).filter(Boolean)));
    const machineMap = new Map<string, string | null>();

    if (machineIds.length > 0) {
        const { data: machines, error: machinesError } = await supabase
            .from("machines")
            .select("id, name")
            .in("id", machineIds);

        if (machinesError) throw machinesError;
        for (const machine of machines ?? []) {
            machineMap.set((machine as any).id, (machine as any).name ?? null);
        }
    }

    return {
        items: rows.map((row) => ({
            id: row.id,
            title: row.title ?? null,
            machine_id: row.machine_id ?? null,
            machine_name: row.machine_id ? machineMap.get(row.machine_id) ?? null : null,
            due_date: row.due_date ?? null,
            priority: row.priority ?? null,
            status: row.status ?? null,
            created_at: row.created_at ?? null,
        })),
    };
}
