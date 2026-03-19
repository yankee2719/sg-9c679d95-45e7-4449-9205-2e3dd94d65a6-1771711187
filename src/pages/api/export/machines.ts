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

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        if (!req.user.organizationId) {
            return res.status(400).json({ error: "No active organization context" });
        }

        const serviceSupabase = getServiceSupabase();
        const orgId = req.user.organizationId;

        const { data: activeOrg, error: activeOrgError } = await serviceSupabase
            .from("organizations")
            .select("id, type")
            .eq("id", orgId)
            .maybeSingle();

        if (activeOrgError) {
            return res.status(500).json({ error: activeOrgError.message });
        }

        if (!activeOrg) {
            return res.status(404).json({ error: "Active organization not found" });
        }

        let machineRows: any[] = [];

        if (activeOrg.type === "manufacturer") {
            const { data, error } = await serviceSupabase
                .from("machines")
                .select(
                    "id, name, internal_code, serial_number, model, brand, lifecycle_state, organization_id, created_at, updated_at"
                )
                .eq("organization_id", orgId)
                .eq("is_archived", false)
                .or("is_deleted.is.null,is_deleted.eq.false")
                .order("created_at", { ascending: false });

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            machineRows = data ?? [];
        } else {
            const { data: ownMachines, error: ownMachinesError } = await serviceSupabase
                .from("machines")
                .select(
                    "id, name, internal_code, serial_number, model, brand, lifecycle_state, organization_id, created_at, updated_at"
                )
                .eq("organization_id", orgId)
                .eq("is_archived", false)
                .or("is_deleted.is.null,is_deleted.eq.false");

            if (ownMachinesError) {
                return res.status(500).json({ error: ownMachinesError.message });
            }

            const { data: assignments, error: assignmentsError } = await serviceSupabase
                .from("machine_assignments")
                .select("machine_id")
                .eq("customer_org_id", orgId)
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
                    .select(
                        "id, name, internal_code, serial_number, model, brand, lifecycle_state, organization_id, created_at, updated_at"
                    )
                    .in("id", assignedIds)
                    .eq("is_archived", false)
                    .or("is_deleted.is.null,is_deleted.eq.false");

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                assignedMachines = data ?? [];
            }

            const merged = new Map < string, any> ();
            for (const row of ownMachines ?? []) merged.set(row.id, row);
            for (const row of assignedMachines) merged.set(row.id, row);

            machineRows = Array.from(merged.values());
        }

        const header = [
            "id",
            "name",
            "internal_code",
            "serial_number",
            "model",
            "brand",
            "lifecycle_state",
            "organization_id",
            "created_at",
            "updated_at",
        ];

        const csv = [
            header.join(","),
            ...machineRows.map((row) =>
                [
                    csvEscape(row.id),
                    csvEscape(row.name),
                    csvEscape(row.internal_code),
                    csvEscape(row.serial_number),
                    csvEscape(row.model),
                    csvEscape(row.brand),
                    csvEscape(row.lifecycle_state),
                    csvEscape(row.organization_id),
                    csvEscape(row.created_at),
                    csvEscape(row.updated_at),
                ].join(",")
            ),
        ].join("\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="machines-export.csv"');
        return res.status(200).send(csv);
    } catch (error: any) {
        console.error("Unexpected error in /api/export/machines:", error);
        return res.status(500).json({ error: error?.message ?? "Internal server error" });
    }
}

export default withAuth(
    ["owner", "admin", "supervisor", "technician", "viewer"],
    handler,
    { allowPlatformAdmin: true }
);