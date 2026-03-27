import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function canAccessMachine(
    supabase: ReturnType<typeof getServiceSupabase>,
    user: AuthenticatedRequest["user"],
    machineId: string,
    machineOrgId: string
) {
    if (!user.organizationId) return false;
    if (machineOrgId === user.organizationId) return true;

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

    const machineId = typeof req.query.id === "string" ? req.query.id : null;
    if (!machineId) {
        return res.status(400).json({ error: "Machine ID is required" });
    }

    try {
        const supabase = getServiceSupabase();
        const { data: machineRow, error: machineErr } = await supabase
            .from("machines")
            .select("id, organization_id, name, internal_code, serial_number, plant_id, production_line_id")
            .eq("id", machineId)
            .maybeSingle();

        if (machineErr) throw machineErr;
        if (!machineRow) return res.status(404).json({ error: "Machine not found" });

        const allowed = await canAccessMachine(
            supabase,
            req.user,
            machineId,
            String((machineRow as any).organization_id)
        );
        if (!allowed) {
            return res.status(403).json({ error: "Machine not accessible in the active organization context." });
        }

        const [{ data: workRows, error: workErr }, { data: assignmentRows, error: assignmentErr }] = await Promise.all([
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

        if (workErr) throw workErr;
        if (assignmentErr) throw assignmentErr;

        const templateIds = Array.from(new Set((assignmentRows ?? []).map((row: any) => row.template_id).filter(Boolean)));
        const templatesMap = new Map < string, any> ();
        if (templateIds.length > 0) {
            const { data: templateRows, error: templateErr } = await supabase
                .from("checklist_templates")
                .select("id, name, version")
                .in("id", templateIds);
            if (templateErr) throw templateErr;
            for (const row of templateRows ?? []) {
                templatesMap.set((row as any).id, row);
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                machine: machineRow,
                workOrders: workRows ?? [],
                checklists: ((assignmentRows ?? []) as any[]).map((assignment) => ({
                    ...assignment,
                    template: templatesMap.get(assignment.template_id) ?? null,
                })),
            },
        });
    } catch (error: any) {
        console.error("Equipment maintenance snapshot API error:", error);
        return res.status(500).json({ error: error?.message || "Failed to load maintenance snapshot" });
    }
}

export default withAuth(["owner", "admin", "supervisor", "technician", "viewer"], handler, {
    allowPlatformAdmin: true,
});

