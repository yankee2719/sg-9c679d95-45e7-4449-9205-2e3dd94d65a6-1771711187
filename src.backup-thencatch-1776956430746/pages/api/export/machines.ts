import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

function csvEscape(value: unknown) {
    const str = String(value ?? "");
    return `"${str.replace(/"/g, '""')}"`;
}

export default withAuth(
    ["owner", "admin", "supervisor", "technician", "viewer"],
    async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
        if (req.method !== "GET") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        const serviceSupabase = getServiceSupabase();
        const organizationId = req.user.organizationId;
        const organizationType = req.user.organizationType;

        if (!organizationId || !organizationType) {
            return res.status(400).json({ error: "No active organization context" });
        }

        try {
            let rows: any[] = [];

            if (organizationType === "manufacturer") {
                const { data, error } = await serviceSupabase
                    .from("machines")
                    .select(`
                        id,
                        name,
                        internal_code,
                        serial_number,
                        model,
                        brand,
                        lifecycle_state,
                        plant_id,
                        production_line_id,
                        organization_id,
                        created_at,
                        updated_at
                    `)
                    .eq("organization_id", organizationId)
                    .eq("is_archived", false)
                    .or("is_deleted.is.null,is_deleted.eq.false")
                    .order("created_at", { ascending: false });

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                rows = data ?? [];
            } else {
                const { data: ownMachines, error: ownError } = await serviceSupabase
                    .from("machines")
                    .select(`
                        id,
                        name,
                        internal_code,
                        serial_number,
                        model,
                        brand,
                        lifecycle_state,
                        plant_id,
                        production_line_id,
                        organization_id,
                        created_at,
                        updated_at
                    `)
                    .eq("organization_id", organizationId)
                    .eq("is_archived", false)
                    .or("is_deleted.is.null,is_deleted.eq.false");

                if (ownError) {
                    return res.status(500).json({ error: ownError.message });
                }

                const { data: assignments, error: assignmentsError } = await serviceSupabase
                    .from("machine_assignments")
                    .select("machine_id")
                    .eq("customer_org_id", organizationId)
                    .eq("is_active", true);

                if (assignmentsError) {
                    return res.status(500).json({ error: assignmentsError.message });
                }

                const assignedIds = Array.from(
                    new Set((assignments ?? []).map((row: any) => row.machine_id).filter(Boolean))
                );

                let assignedMachines: any[] = [];
                if (assignedIds.length > 0) {
                    const { data, error } = await serviceSupabase
                        .from("machines")
                        .select(`
                            id,
                            name,
                            internal_code,
                            serial_number,
                            model,
                            brand,
                            lifecycle_state,
                            plant_id,
                            production_line_id,
                            organization_id,
                            created_at,
                            updated_at
                        `)
                        .in("id", assignedIds)
                        .eq("is_archived", false)
                        .or("is_deleted.is.null,is_deleted.eq.false");

                    if (error) {
                        return res.status(500).json({ error: error.message });
                    }

                    assignedMachines = data ?? [];
                }

                const merged = new Map<string, any>();
                for (const row of ownMachines ?? []) merged.set(row.id, row);
                for (const row of assignedMachines) merged.set(row.id, row);

                rows = Array.from(merged.values());
            }

            const header = [
                "id",
                "name",
                "internal_code",
                "serial_number",
                "model",
                "brand",
                "lifecycle_state",
                "plant_id",
                "production_line_id",
                "organization_id",
                "created_at",
                "updated_at",
            ];

            const csv = [
                header.join(";"),
                ...rows.map((row) => header.map((key) => csvEscape(row[key])).join(";")),
            ].join("\n");

            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="machines_export_${Date.now()}.csv"`
            );

            return res.status(200).send(csv);
        } catch (error: any) {
            console.error("Export machines error:", error);
            return res.status(500).json({
                error: error?.message || "Internal server error",
            });
        }
    },
    { allowPlatformAdmin: true }
);