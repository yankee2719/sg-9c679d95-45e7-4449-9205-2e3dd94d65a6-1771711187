import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "@/lib/apiAuth";

type ApiUser = AuthenticatedRequest["user"];

export interface EquipmentCatalogMachineRow {
    id: string;
    name: string | null;
    internal_code: string | null;
    serial_number: string | null;
    model: string | null;
    brand: string | null;
    lifecycle_state: string | null;
    organization_id: string | null;
    plant_id: string | null;
    production_line_id: string | null;
    is_archived: boolean | null;
    is_deleted?: boolean | null;
    created_at?: string | null;
}

export interface EquipmentCatalogPayload {
    machines: EquipmentCatalogMachineRow[];
    hiddenMachineIds: string[];
    assignmentCount: number;
}

export class EquipmentCatalogError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.name = "EquipmentCatalogError";
        this.statusCode = statusCode;
    }
}

async function listManufacturerMachines(
    supabase: SupabaseClient,
    organizationId: string
): Promise<EquipmentCatalogPayload> {
    const [machinesRes, assignmentsRes] = await Promise.all([
        supabase
            .from("machines")
            .select(
                "id, name, internal_code, serial_number, model, brand, lifecycle_state, organization_id, plant_id, production_line_id, is_archived, is_deleted, created_at"
            )
            .eq("organization_id", organizationId)
            .eq("is_archived", false)
            .or("is_deleted.is.null,is_deleted.eq.false")
            .order("created_at", { ascending: false }),
        supabase
            .from("machine_assignments")
            .select("machine_id")
            .eq("manufacturer_org_id", organizationId)
            .eq("is_active", true),
    ]);

    if (machinesRes.error) throw machinesRes.error;
    if (assignmentsRes.error) throw assignmentsRes.error;

    return {
        machines: (machinesRes.data ?? []) as EquipmentCatalogMachineRow[],
        hiddenMachineIds: [],
        assignmentCount: (assignmentsRes.data ?? []).length,
    };
}

async function listCustomerMachines(
    supabase: SupabaseClient,
    organizationId: string
): Promise<EquipmentCatalogPayload> {
    const [ownRes, assignmentsRes, hiddenRes] = await Promise.all([
        supabase
            .from("machines")
            .select(
                "id, name, internal_code, serial_number, model, brand, lifecycle_state, organization_id, plant_id, production_line_id, is_archived, is_deleted, created_at"
            )
            .eq("organization_id", organizationId)
            .eq("is_archived", false)
            .or("is_deleted.is.null,is_deleted.eq.false"),
        supabase
            .from("machine_assignments")
            .select("machine_id")
            .eq("customer_org_id", organizationId)
            .eq("is_active", true),
        supabase
            .from("customer_hidden_machines")
            .select("machine_id")
            .eq("customer_org_id", organizationId),
    ]);

    if (ownRes.error) throw ownRes.error;
    if (assignmentsRes.error) throw assignmentsRes.error;
    if (hiddenRes.error) throw hiddenRes.error;

    const assignedIds = Array.from(
        new Set((assignmentsRes.data ?? []).map((row: any) => row.machine_id).filter(Boolean))
    ) as string[];

    let assignedMachines: EquipmentCatalogMachineRow[] = [];
    if (assignedIds.length > 0) {
        const assignedRes = await supabase
            .from("machines")
            .select(
                "id, name, internal_code, serial_number, model, brand, lifecycle_state, organization_id, plant_id, production_line_id, is_archived, is_deleted, created_at"
            )
            .in("id", assignedIds)
            .eq("is_archived", false)
            .or("is_deleted.is.null,is_deleted.eq.false");

        if (assignedRes.error) throw assignedRes.error;
        assignedMachines = (assignedRes.data ?? []) as EquipmentCatalogMachineRow[];
    }

    const merged = new Map < string, EquipmentCatalogMachineRow> ();
    for (const row of (ownRes.data ?? []) as EquipmentCatalogMachineRow[]) merged.set(row.id, row);
    for (const row of assignedMachines) merged.set(row.id, row);

    return {
        machines: Array.from(merged.values()).sort((a, b) => {
            const da = a.created_at ? new Date(a.created_at).getTime() : 0;
            const db = b.created_at ? new Date(b.created_at).getTime() : 0;
            return db - da;
        }),
        hiddenMachineIds: (hiddenRes.data ?? []).map((row: any) => row.machine_id).filter(Boolean),
        assignmentCount: (assignmentsRes.data ?? []).length,
    };
}

export async function listEquipmentCatalog(
    supabase: SupabaseClient,
    user: ApiUser
): Promise<EquipmentCatalogPayload> {
    if (!user.organizationId || !user.organizationType) {
        throw new EquipmentCatalogError("No active organization context", 400);
    }

    if (user.organizationType === "manufacturer") {
        return listManufacturerMachines(supabase, user.organizationId);
    }

    if (user.organizationType === "customer") {
        return listCustomerMachines(supabase, user.organizationId);
    }

    throw new EquipmentCatalogError("Unsupported organization type", 400);
}
