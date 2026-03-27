import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

export default withAuth(["owner", "admin", "supervisor", "technician", "viewer"], async function handler(
    req: AuthenticatedRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const supabase = getServiceSupabase();
    const organizationId = req.user.organizationId;
    const organizationType = req.user.organizationType;

    if (!organizationId || !organizationType) {
        return res.status(400).json({ error: "No active organization context" });
    }

    try {
        const [machinesRes, assignmentsRes, hiddenRes] = await Promise.all([
            supabase
                .from("machines")
                .select(
                    "id, name, internal_code, serial_number, model, brand, lifecycle_state, organization_id, plant_id, production_line_id, is_archived, is_deleted, created_at"
                )
                .eq("is_archived", false)
                .or("is_deleted.is.null,is_deleted.eq.false")
                .order("created_at", { ascending: false }),
            supabase
                .from("machine_assignments")
                .select("machine_id, customer_org_id, manufacturer_org_id, is_active")
                .eq("is_active", true),
            organizationType === "customer"
                ? supabase
                    .from("customer_hidden_machines")
                    .select("machine_id")
                    .eq("customer_org_id", organizationId)
                : Promise.resolve({ data: [], error: null } as any),
        ]);

        if (machinesRes.error) return res.status(500).json({ error: machinesRes.error.message });
        if (assignmentsRes.error) return res.status(500).json({ error: assignmentsRes.error.message });
        if (hiddenRes.error) return res.status(500).json({ error: hiddenRes.error.message });

        return res.status(200).json({
            machines: machinesRes.data ?? [],
            assignments: assignmentsRes.data ?? [],
            hidden_machine_ids: (hiddenRes.data ?? []).map((row: any) => row.machine_id).filter(Boolean),
        });
    } catch (error: any) {
        console.error("Machine catalog API error:", error);
        return res.status(500).json({ error: error?.message || "Failed to load machine catalog" });
    }
});
