import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { getAccessibleMachine } from "@/lib/server/machineAccess";

function canManageMachine(role: string | null | undefined) {
    const normalized = String(role ?? "").toLowerCase();
    return normalized === "admin" || normalized === "supervisor" || normalized === "owner";
}

export default withAuth(["admin", "supervisor", "technician"], async function handler(
    req: AuthenticatedRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const machineId = typeof req.query.id === "string" ? req.query.id : null;
    if (!machineId) {
        return res.status(400).json({ error: "Missing machine id" });
    }

    const supabase = getServiceSupabase();

    try {
        const machine = await getAccessibleMachine<any>(
            supabase,
            req.user,
            machineId,
            [
                "id",
                "name",
                "internal_code",
                "serial_number",
                "model",
                "brand",
                "notes",
                "lifecycle_state",
                "organization_id",
                "plant_id",
                "production_line_id",
                "photo_url",
                "created_at",
                "area",
            ].join(", ")
        );

        if (!machine) {
            return res.status(404).json({ error: "Machine not found" });
        }

        const [plantRes, lineRes, ownerRes, assignmentRes] = await Promise.all([
            machine.plant_id
                ? supabase.from("plants").select("id, name, code").eq("id", machine.plant_id).maybeSingle()
                : Promise.resolve({ data: null, error: null } as const),
            machine.production_line_id
                ? supabase.from("production_lines").select("id, name, code").eq("id", machine.production_line_id).maybeSingle()
                : Promise.resolve({ data: null, error: null } as const),
            machine.organization_id
                ? supabase.from("organizations").select("id, name").eq("id", machine.organization_id).maybeSingle()
                : Promise.resolve({ data: null, error: null } as const),
            supabase
                .from("machine_assignments")
                .select("id, customer_org_id")
                .eq("machine_id", machine.id)
                .eq("is_active", true)
                .maybeSingle(),
        ]);

        if (plantRes.error) throw plantRes.error;
        if (lineRes.error) throw lineRes.error;
        if (ownerRes.error) throw ownerRes.error;
        if (assignmentRes.error) throw assignmentRes.error;

        let assignedCustomerName: string | null = null;

        if (assignmentRes.data?.customer_org_id) {
            const { data: customerOrg, error: customerOrgError } = await supabase
                .from("organizations")
                .select("id, name")
                .eq("id", assignmentRes.data.customer_org_id)
                .maybeSingle();

            if (customerOrgError) throw customerOrgError;
            assignedCustomerName = customerOrg?.name ?? null;
        }

        const canEditOrDelete =
            (req.user.isPlatformAdmin || canManageMachine(req.user.role)) &&
            machine.organization_id === req.user.organizationId;

        return res.status(200).json({
            machine,
            plant: plantRes.data ?? null,
            line: lineRes.data ?? null,
            ownerOrganization: ownerRes.data ?? null,
            assignedCustomerName,
            can_edit_machine: canEditOrDelete,
            can_delete_machine: canEditOrDelete,
        });
    } catch (error: any) {
        console.error("Machine snapshot API error:", error);

        if (error?.message === "Access denied") {
            return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        }

        return res.status(500).json({
            error: error?.message || "Failed to load machine snapshot",
        });
    }
});