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

        if (req.user.organizationType !== "manufacturer" && !req.user.isPlatformAdmin) {
            return res.status(403).json({ error: "Assignments export is available only in manufacturer context" });
        }

        const orgId = req.user.organizationId;
        const serviceSupabase = getServiceSupabase();

        const { data: assignments, error: assignmentsError } = await serviceSupabase
            .from("machine_assignments")
            .select(
                "id, machine_id, customer_org_id, manufacturer_org_id, assigned_by, assigned_at, is_active"
            )
            .eq("manufacturer_org_id", orgId)
            .eq("is_active", true)
            .order("assigned_at", { ascending: false });

        if (assignmentsError) {
            return res.status(500).json({ error: assignmentsError.message });
        }

        const machineIds = Array.from(
            new Set((assignments ?? []).map((row: any) => row.machine_id).filter(Boolean))
        );

        const customerIds = Array.from(
            new Set((assignments ?? []).map((row: any) => row.customer_org_id).filter(Boolean))
        );

        const userIds = Array.from(
            new Set((assignments ?? []).map((row: any) => row.assigned_by).filter(Boolean))
        );

        let machineMap = new Map<string, any>();
        let customerMap = new Map<string, any>();
        let userMap = new Map<string, any>();

        if (machineIds.length > 0) {
            const { data, error } = await serviceSupabase
                .from("machines")
                .select("id, name, internal_code, serial_number, model, brand")
                .in("id", machineIds);

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            machineMap = new Map((data ?? []).map((row: any) => [row.id, row]));
        }

        if (customerIds.length > 0) {
            const { data, error } = await serviceSupabase
                .from("organizations")
                .select("id, name, city, email")
                .in("id", customerIds);

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            customerMap = new Map((data ?? []).map((row: any) => [row.id, row]));
        }

        if (userIds.length > 0) {
            const { data, error } = await serviceSupabase
                .from("profiles")
                .select("id, display_name, first_name, last_name, email")
                .in("id", userIds);

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            userMap = new Map((data ?? []).map((row: any) => [row.id, row]));
        }

        const header = [
            "assignment_id",
            "machine_id",
            "machine_name",
            "internal_code",
            "serial_number",
            "model",
            "brand",
            "customer_org_id",
            "customer_name",
            "customer_city",
            "customer_email",
            "assigned_by",
            "assigned_by_name",
            "assigned_by_email",
            "assigned_at",
            "manufacturer_org_id",
            "is_active",
        ];

        const csv = [
            header.join(","),
            ...(assignments ?? []).map((row: any) => {
                const machine = machineMap.get(row.machine_id);
                const customer = customerMap.get(row.customer_org_id);
                const user = userMap.get(row.assigned_by);

                const assignedByName =
                    user?.display_name?.trim() ||
                    `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() ||
                    user?.email ||
                    row.assigned_by;

                return [
                    csvEscape(row.id),
                    csvEscape(row.machine_id),
                    csvEscape(machine?.name),
                    csvEscape(machine?.internal_code),
                    csvEscape(machine?.serial_number),
                    csvEscape(machine?.model),
                    csvEscape(machine?.brand),
                    csvEscape(row.customer_org_id),
                    csvEscape(customer?.name),
                    csvEscape(customer?.city),
                    csvEscape(customer?.email),
                    csvEscape(row.assigned_by),
                    csvEscape(assignedByName),
                    csvEscape(user?.email),
                    csvEscape(row.assigned_at),
                    csvEscape(row.manufacturer_org_id),
                    csvEscape(row.is_active),
                ].join(",");
            }),
        ].join("\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="assignments-export.csv"');
        return res.status(200).send(csv);
    } catch (error: any) {
        console.error("Unexpected error in /api/export/assignments:", error);
        return res.status(500).json({ error: error?.message ?? "Internal server error" });
    }
}

export default withAuth(["owner", "admin", "supervisor"], handler, {
    allowPlatformAdmin: true,
});