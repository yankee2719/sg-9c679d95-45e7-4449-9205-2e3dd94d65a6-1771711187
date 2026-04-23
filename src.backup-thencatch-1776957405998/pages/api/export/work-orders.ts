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

        const orgId = req.user.organizationId;
        const serviceSupabase = getServiceSupabase();

        const { data: rows, error } = await serviceSupabase
            .from("work_orders")
            .select(
                "id, title, description, status, priority, due_date, machine_id, assigned_to, organization_id, created_at, updated_at"
            )
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const header = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "machine_id",
            "assigned_to",
            "organization_id",
            "created_at",
            "updated_at",
        ];

        const csv = [
            header.join(","),
            ...(rows ?? []).map((row: any) =>
                [
                    csvEscape(row.id),
                    csvEscape(row.title),
                    csvEscape(row.description),
                    csvEscape(row.status),
                    csvEscape(row.priority),
                    csvEscape(row.due_date),
                    csvEscape(row.machine_id),
                    csvEscape(row.assigned_to),
                    csvEscape(row.organization_id),
                    csvEscape(row.created_at),
                    csvEscape(row.updated_at),
                ].join(",")
            ),
        ].join("\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="work-orders-export.csv"');
        return res.status(200).send(csv);
    } catch (error: any) {
        console.error("Unexpected error in /api/export/work-orders:", error);
        return res.status(500).json({ error: error?.message ?? "Internal server error" });
    }
}

export default withAuth(
    ["owner", "admin", "supervisor", "technician", "viewer"],
    handler,
    { allowPlatformAdmin: true }
);