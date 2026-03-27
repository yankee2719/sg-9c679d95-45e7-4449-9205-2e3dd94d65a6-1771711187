import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { getAccessibleMachine } from "@/lib/server/machineAccess";

export default withAuth(["owner", "admin", "supervisor", "technician", "viewer"], async function handler(
    req: AuthenticatedRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const machineId = typeof req.query.id === "string" ? req.query.id : null;
    if (!machineId) return res.status(400).json({ error: "Missing machine id" });

    const supabase = getServiceSupabase();

    try {
        const machine = await getAccessibleMachine < any > (
            supabase,
            req.user,
            machineId,
            "id, name, internal_code, serial_number, model, brand, notes, lifecycle_state, organization_id, plant_id, production_line_id, photo_url, created_at"
        );
        if (!machine) return res.status(404).json({ error: "Machine not found" });

        const [plantRes, lineRes, ownerRes, assignmentRes] = await Promise.all([
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
                .eq("machine_id", machine.id)
                .eq("is_active", true)
                .maybeSingle(),
        ]);

        if (plantRes.error) throw plantRes.error;
        if (lineRes.error) throw lineRes.error;
        if (ownerRes.error) throw ownerRes.error;
        if (assignmentRes.error) throw assignmentRes.error;

        return res.status(200).json({
            machine,
            plant: plantRes.data ?? null,
            line: lineRes.data ?? null,
            ownerOrganization: ownerRes.data ?? null,
            assignedCustomerName: (assignmentRes.data as any)?.organizations?.name ?? null,
            can_edit_machine: ["owner", "admin", "supervisor"].includes(req.user.role) && machine.organization_id === req.user.organizationId,
            can_delete_machine: ["owner", "admin", "supervisor"].includes(req.user.role) && machine.organization_id === req.user.organizationId,
        });
    } catch (error: any) {
        console.error("Machine snapshot API error:", error);
        return res.status(error?.message === "Access denied" ? 403 : 500).json({ error: error?.message || "Failed to load machine snapshot" });
    }
});
