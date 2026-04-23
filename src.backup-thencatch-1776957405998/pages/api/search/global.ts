import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

type SearchItem = {
    id: string;
    label: string;
    subLabel: string;
    href: string;
    type: "machine" | "customer" | "document" | "work_order";
};

type SearchResponse = {
    machines: SearchItem[];
    customers: SearchItem[];
    documents: SearchItem[];
    workOrders: SearchItem[];
};

function emptyResponse(): SearchResponse {
    return {
        machines: [],
        customers: [],
        documents: [],
        workOrders: [],
    };
}

function safeLike(value: string) {
    return `%${value.replace(/[%_]/g, "").trim()}%`;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const q = String(req.query.q ?? "").trim();
        if (q.length < 2) {
            return res.status(200).json(emptyResponse());
        }

        if (!req.user.organizationId) {
            return res.status(400).json({ error: "No active organization context" });
        }

        const serviceSupabase = getServiceSupabase();
        const like = safeLike(q);
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

        const result = emptyResponse();

        if (activeOrg.type === "manufacturer") {
            const [machinesRes, customersRes, documentsRes, workOrdersRes] = await Promise.all([
                serviceSupabase
                    .from("machines")
                    .select("id, name, internal_code, serial_number, model, brand")
                    .eq("organization_id", orgId)
                    .eq("is_archived", false)
                    .or("is_deleted.is.null,is_deleted.eq.false")
                    .or(
                        `name.ilike.${like},internal_code.ilike.${like},serial_number.ilike.${like},model.ilike.${like},brand.ilike.${like}`
                    )
                    .limit(6),
                serviceSupabase
                    .from("organizations")
                    .select("id, name, city, email")
                    .eq("manufacturer_org_id", orgId)
                    .eq("type", "customer")
                    .or("is_deleted.is.null,is_deleted.eq.false")
                    .or(`name.ilike.${like},city.ilike.${like},email.ilike.${like}`)
                    .limit(6),
                serviceSupabase
                    .from("documents")
                    .select("id, title, category, language, machine_id")
                    .eq("organization_id", orgId)
                    .eq("is_archived", false)
                    .or(`title.ilike.${like},category.ilike.${like},language.ilike.${like}`)
                    .limit(6),
                serviceSupabase
                    .from("work_orders")
                    .select("id, title, status, machine_id, due_date")
                    .eq("organization_id", orgId)
                    .or(`title.ilike.${like},status.ilike.${like}`)
                    .limit(6),
            ]);

            if (machinesRes.error) throw machinesRes.error;
            if (customersRes.error) throw customersRes.error;
            if (documentsRes.error) throw documentsRes.error;
            if (workOrdersRes.error) throw workOrdersRes.error;

            result.machines = (machinesRes.data ?? []).map((row: any) => ({
                id: row.id,
                label: row.name || "Macchina",
                subLabel: [row.internal_code, row.serial_number, row.brand, row.model]
                    .filter(Boolean)
                    .join(" · "),
                href: `/equipment/${row.id}`,
                type: "machine",
            }));

            result.customers = (customersRes.data ?? []).map((row: any) => ({
                id: row.id,
                label: row.name || "Cliente",
                subLabel: [row.city, row.email].filter(Boolean).join(" · "),
                href: `/customers/${row.id}`,
                type: "customer",
            }));

            result.documents = (documentsRes.data ?? []).map((row: any) => ({
                id: row.id,
                label: row.title || "Documento",
                subLabel: [row.category, row.language, row.machine_id ? `machine ${row.machine_id}` : null]
                    .filter(Boolean)
                    .join(" · "),
                href: row.machine_id
                    ? `/equipment/${row.machine_id}#machine-documents`
                    : "/documents",
                type: "document",
            }));

            result.workOrders = (workOrdersRes.data ?? []).map((row: any) => ({
                id: row.id,
                label: row.title || "Work order",
                subLabel: [row.status, row.due_date].filter(Boolean).join(" · "),
                href: `/work-orders/${row.id}`,
                type: "work_order",
            }));

            return res.status(200).json(result);
        }

        const [ownMachinesRes, assignmentsRes, workOrdersRes, documentsRes] = await Promise.all([
            serviceSupabase
                .from("machines")
                .select("id, name, internal_code, serial_number, model, brand")
                .eq("organization_id", orgId)
                .eq("is_archived", false)
                .or("is_deleted.is.null,is_deleted.eq.false")
                .or(
                    `name.ilike.${like},internal_code.ilike.${like},serial_number.ilike.${like},model.ilike.${like},brand.ilike.${like}`
                )
                .limit(6),
            serviceSupabase
                .from("machine_assignments")
                .select("machine_id")
                .eq("customer_org_id", orgId)
                .eq("is_active", true),
            serviceSupabase
                .from("work_orders")
                .select("id, title, status, machine_id, due_date")
                .eq("organization_id", orgId)
                .or(`title.ilike.${like},status.ilike.${like}`)
                .limit(6),
            serviceSupabase
                .from("documents")
                .select("id, title, category, language, machine_id")
                .eq("is_archived", false)
                .or(`title.ilike.${like},category.ilike.${like},language.ilike.${like}`)
                .limit(20),
        ]);

        if (ownMachinesRes.error) throw ownMachinesRes.error;
        if (assignmentsRes.error) throw assignmentsRes.error;
        if (workOrdersRes.error) throw workOrdersRes.error;
        if (documentsRes.error) throw documentsRes.error;

        const assignedIds = Array.from(
            new Set((assignmentsRes.data ?? []).map((row: any) => row.machine_id).filter(Boolean))
        );

        let assignedMachines: any[] = [];
        if (assignedIds.length > 0) {
            const assignedMachinesRes = await serviceSupabase
                .from("machines")
                .select("id, name, internal_code, serial_number, model, brand")
                .in("id", assignedIds)
                .eq("is_archived", false)
                .or("is_deleted.is.null,is_deleted.eq.false")
                .or(
                    `name.ilike.${like},internal_code.ilike.${like},serial_number.ilike.${like},model.ilike.${like},brand.ilike.${like}`
                )
                .limit(6);

            if (assignedMachinesRes.error) throw assignedMachinesRes.error;
            assignedMachines = assignedMachinesRes.data ?? [];
        }

        const machineMap = new Map<string, any>();
        for (const row of ownMachinesRes.data ?? []) machineMap.set(row.id, row);
        for (const row of assignedMachines) machineMap.set(row.id, row);

        const accessibleMachineIds = new Set(Array.from(machineMap.keys()));

        result.machines = Array.from(machineMap.values())
            .slice(0, 8)
            .map((row: any) => ({
                id: row.id,
                label: row.name || "Macchina",
                subLabel: [row.internal_code, row.serial_number, row.brand, row.model]
                    .filter(Boolean)
                    .join(" · "),
                href: `/equipment/${row.id}`,
                type: "machine",
            }));

        result.documents = (documentsRes.data ?? [])
            .filter((row: any) => row.machine_id && accessibleMachineIds.has(row.machine_id))
            .slice(0, 8)
            .map((row: any) => ({
                id: row.id,
                label: row.title || "Documento",
                subLabel: [row.category, row.language].filter(Boolean).join(" · "),
                href: `/equipment/${row.machine_id}#machine-documents`,
                type: "document",
            }));

        result.workOrders = (workOrdersRes.data ?? []).map((row: any) => ({
            id: row.id,
            label: row.title || "Work order",
            subLabel: [row.status, row.due_date].filter(Boolean).join(" · "),
            href: `/work-orders/${row.id}`,
            type: "work_order",
        }));

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("Unexpected error in /api/search/global:", error);
        return res.status(500).json({
            error: error?.message ?? "Internal server error",
        });
    }
}

export default withAuth(
    ["technician"],
    handler,
    { allowPlatformAdmin: true }
);