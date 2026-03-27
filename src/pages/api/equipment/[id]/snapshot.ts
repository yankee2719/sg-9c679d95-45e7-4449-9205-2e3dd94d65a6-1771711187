import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function hasMachineAccess(
    supabase: ReturnType<typeof getServiceSupabase>,
    user: AuthenticatedRequest["user"],
    machineId: string,
    machineOrgId: string | null
) {
    if (!user.organizationId) return false;
    if (machineOrgId && machineOrgId === user.organizationId) return true;

    const { data, error } = await supabase
        .from("machine_assignments")
        .select("id")
        .eq("machine_id", machineId)
        .eq("is_active", true)
        .or(`manufacturer_org_id.eq.${user.organizationId},customer_org_id.eq.${user.organizationId}`)
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return !!data;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const machineId = typeof req.query.id === "string" ? req.query.id : "";
    if (!machineId) {
        return res.status(400).json({ error: "Machine ID is required" });
    }

    try {
        const supabase = getServiceSupabase();
        const { data: machine, error: machineError } = await supabase
            .from("machines")
            .select("id, name, internal_code, serial_number, model, brand, notes, lifecycle_state, organization_id, plant_id, production_line_id, photo_url, created_at")
            .eq("id", machineId)
            .maybeSingle();

        if (machineError) throw machineError;
        if (!machine) return res.status(404).json({ error: "Machine not found" });

        const allowed = await hasMachineAccess(supabase, req.user, machineId, (machine as any).organization_id ?? null);
        if (!allowed) {
            return res.status(403).json({ error: "Machine not accessible in the active organization context." });
        }

        const [plantRes, lineRes, ownerRes, assignmentRes, workOrdersRes, documentsRes] = await Promise.all([
            machine.plant_id
                ? supabase.from("plants").select("id, name, code").eq("id", machine.plant_id).maybeSingle()
                : Promise.resolve({ data: null, error: null } as any),
            machine.production_line_id
                ? supabase.from("production_lines").select("id, name, code").eq("id", machine.production_line_id).maybeSingle()
                : Promise.resolve({ data: null, error: null } as any),
            machine.organization_id
                ? supabase.from("organizations").select("id, name").eq("id", machine.organization_id).maybeSingle()
                : Promise.resolve({ data: null, error: null } as any),
            supabase
                .from("machine_assignments")
                .select("id, customer_org_id, organizations:customer_org_id(id, name)")
                .eq("machine_id", machineId)
                .eq("is_active", true)
                .limit(1)
                .maybeSingle(),
            supabase
                .from("work_orders")
                .select("id, title, status, priority, due_date, created_at")
                .eq("machine_id", machineId)
                .order("created_at", { ascending: false })
                .limit(6),
            supabase
                .from("documents")
                .select("id, title, category, updated_at, file_size")
                .eq("machine_id", machineId)
                .eq("is_archived", false)
                .order("updated_at", { ascending: false })
                .limit(6),
        ]);

        for (const entry of [plantRes, lineRes, ownerRes, assignmentRes, workOrdersRes, documentsRes]) {
            if (entry?.error) throw entry.error;
        }

        const canManage = ["owner", "admin", "supervisor"].includes(req.user.role);
        const canEdit = canManage && machine.organization_id === req.user.organizationId;

        return res.status(200).json({
            success: true,
            snapshot: {
                machine,
                plant: plantRes.data ?? null,
                line: lineRes.data ?? null,
                ownerOrganization: ownerRes.data ?? null,
                assignedCustomerName: (assignmentRes.data as any)?.organizations?.name ?? null,
                workOrders: workOrdersRes.data ?? [],
                documents: documentsRes.data ?? [],
                machineContext: {
                    canEdit,
                    canDelete: canEdit,
                    userRole: req.user.role,
                    orgType: req.user.organizationType,
                },
                generatedAt: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        console.error("Equipment snapshot API error:", error);
        return res.status(500).json({ error: error?.message || "Failed to load equipment snapshot" });
    }
}

export default withAuth(["owner", "admin", "supervisor", "technician", "viewer"], handler, {
    allowPlatformAdmin: true,
});
