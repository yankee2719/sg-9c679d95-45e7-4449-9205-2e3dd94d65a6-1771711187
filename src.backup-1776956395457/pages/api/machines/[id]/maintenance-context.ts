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
            "id, organization_id, name, internal_code, serial_number, plant_id, production_line_id"
        );
        if (!machine) return res.status(404).json({ error: "Machine not found" });

        const [workOrdersRes, assignmentsRes] = await Promise.all([
            supabase
                .from("work_orders")
                .select("id, title, status, priority, due_date, created_at")
                .eq("machine_id", machineId)
                .order("created_at", { ascending: false }),
            supabase
                .from("checklist_assignments")
                .select("id, template_id, is_active")
                .eq("machine_id", machineId)
                .eq("is_active", true),
        ]);

        if (workOrdersRes.error) throw workOrdersRes.error;
        if (assignmentsRes.error) throw assignmentsRes.error;

        const templateIds = Array.from(new Set((assignmentsRes.data ?? []).map((row: any) => row.template_id).filter(Boolean)));
        let templateRows: any[] = [];
        if (templateIds.length > 0) {
            const { data, error } = await supabase
                .from("checklist_templates")
                .select("id, name, version")
                .in("id", templateIds);
            if (error) throw error;
            templateRows = data ?? [];
        }

        const templateMap = new Map(templateRows.map((row: any) => [row.id, row]));
        const checklistAssignments = (assignmentsRes.data ?? []).map((row: any) => ({
            ...row,
            template: templateMap.get(row.template_id) ?? null,
        }));

        return res.status(200).json({
            machine,
            workOrders: workOrdersRes.data ?? [],
            checklistAssignments,
            canCreate: ["owner", "admin", "supervisor"].includes(req.user.role),
            activeOrgId: req.user.organizationId,
            role: req.user.role,
        });
    } catch (error: any) {
        console.error("Machine maintenance context API error:", error);
        return res.status(error?.message === "Access denied" ? 403 : 500).json({ error: error?.message || "Failed to load maintenance context" });
    }
});
