import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import { getAccessibleMachineIds } from "@/lib/server/customerVisibility";

type OrgType = "manufacturer" | "customer" | null;

interface DashboardKpis {
    machineCount: number;
    customerCount: number;
    activeAssignments: number;
    openWorkOrders: number;
    overdueWorkOrders: number;
    activeChecklists: number;
    activeDocuments: number;
}

interface RecentActivityRow {
    id: string;
    entity_type: string | null;
    action: string | null;
    created_at: string;
    entity_id: string | null;
    machine_id: string | null;
    metadata?: any;
}

interface RecentMachineRow {
    id: string;
    name: string | null;
    internal_code: string | null;
    lifecycle_state: string | null;
    updated_at: string | null;
    photo_url?: string | null;
    organization_id?: string | null;
}

interface DashboardSummaryResponse {
    kpis: DashboardKpis;
    recentMachines: RecentMachineRow[];
    recentActivity: RecentActivityRow[];
    generatedAt: string;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const orgId = req.user.organizationId;
        const orgType = (req.user.organizationType as OrgType | undefined) ?? null;

        if (!orgId || !orgType) {
            return res.status(400).json({ error: "No active organization context" });
        }

        const serviceSupabase = getServiceSupabase();
        const nowIso = new Date().toISOString();
        const accessibleMachineIds = await getAccessibleMachineIds(serviceSupabase, req.user);

        const [
            machinesRes,
            assignmentsRes,
            checklistRes,
            documentsRes,
            auditRes,
            workOrdersRes,
            customersRes,
        ] = await Promise.all([
            serviceSupabase
                .from("machines")
                .select("id, name, internal_code, lifecycle_state, updated_at, photo_url, organization_id")
                .eq("is_archived", false)
                .or("is_deleted.is.null,is_deleted.eq.false")
                .order("updated_at", { ascending: false }),

            serviceSupabase
                .from("machine_assignments")
                .select("machine_id, customer_org_id, manufacturer_org_id, is_active")
                .eq("is_active", true),

            serviceSupabase
                .from("checklist_templates")
                .select("id, organization_id")
                .eq("is_active", true),

            serviceSupabase
                .from("documents")
                .select("id, organization_id, machine_id")
                .eq("is_archived", false),

            serviceSupabase
                .from("audit_logs")
                .select("id, entity_type, action, created_at, entity_id, machine_id, metadata, organization_id")
                .order("created_at", { ascending: false })
                .limit(100),

            serviceSupabase
                .from("work_orders")
                .select("id, title, status, due_date, machine_id, organization_id")
                .order("due_date", { ascending: true })
                .limit(300),

            serviceSupabase
                .from("organizations")
                .select("id, manufacturer_org_id, type, is_deleted")
                .eq("type", "customer"),
        ]);

        if (machinesRes.error) return res.status(500).json({ error: machinesRes.error.message });
        if (assignmentsRes.error) return res.status(500).json({ error: assignmentsRes.error.message });
        if (checklistRes.error) return res.status(500).json({ error: checklistRes.error.message });
        if (documentsRes.error) return res.status(500).json({ error: documentsRes.error.message });
        if (workOrdersRes.error) return res.status(500).json({ error: workOrdersRes.error.message });
        if (customersRes.error) return res.status(500).json({ error: customersRes.error.message });

        const allMachines = (machinesRes.data ?? []) as RecentMachineRow[];
        const allAssignments = (assignmentsRes.data ?? []) as any[];
        const allCustomers = (customersRes.data ?? []) as any[];
        const accessibleMachineIdSet = new Set(accessibleMachineIds);

        let myMachines: RecentMachineRow[] = [];
        let myCustomerCount = 0;
        let myAssignmentCount = 0;

        if (orgType === "manufacturer") {
            myMachines = allMachines.filter((m) => m.organization_id === orgId);
            const myAssignments = allAssignments.filter((a: any) => a.manufacturer_org_id === orgId);
            myAssignmentCount = myAssignments.length;
            myCustomerCount = allCustomers.filter(
                (c: any) => c.manufacturer_org_id === orgId && (c.is_deleted === null || c.is_deleted === false)
            ).length;
        } else {
            const assignedToMe = allAssignments.filter((a: any) => a.customer_org_id === orgId);
            myAssignmentCount = assignedToMe.length;
            myMachines = allMachines
                .filter((m) => accessibleMachineIdSet.has(m.id))
                .sort((a, b) => {
                    const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                    const db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                    return db - da;
                });
        }

        const myChecklists = (checklistRes.data ?? []).filter((r: any) => r.organization_id === orgId);

        const myDocuments = orgType === "manufacturer"
            ? (documentsRes.data ?? []).filter((r: any) => r.organization_id === orgId)
            : (documentsRes.data ?? []).filter(
                (r: any) => r.organization_id === orgId || (r.machine_id && accessibleMachineIdSet.has(r.machine_id))
            );

        const myAuditLogs = auditRes.error
            ? []
            : orgType === "manufacturer"
                ? (auditRes.data ?? []).filter((r: any) => r.organization_id === orgId).slice(0, 8)
                : (auditRes.data ?? [])
                    .filter((r: any) => r.organization_id === orgId || (r.machine_id && accessibleMachineIdSet.has(r.machine_id)))
                    .slice(0, 8);

        const myWorkOrders = orgType === "manufacturer"
            ? (workOrdersRes.data ?? []).filter((r: any) => r.organization_id === orgId)
            : (workOrdersRes.data ?? []).filter(
                (r: any) => r.organization_id === orgId || (r.machine_id && accessibleMachineIdSet.has(r.machine_id))
            );

        const openWorkOrders = myWorkOrders.filter((row: any) => {
            const s = String(row.status ?? "").toLowerCase();
            return !["completed", "closed", "cancelled"].includes(s);
        }).length;

        const overdueWorkOrders = myWorkOrders.filter((row: any) => {
            const s = String(row.status ?? "").toLowerCase();
            const d = row.due_date ? new Date(row.due_date).toISOString() : null;
            return !!d && d < nowIso && !["completed", "closed", "cancelled"].includes(s);
        }).length;

        const kpis: DashboardKpis = {
            machineCount: myMachines.length,
            customerCount: myCustomerCount,
            activeAssignments: myAssignmentCount,
            openWorkOrders,
            overdueWorkOrders,
            activeChecklists: myChecklists.length,
            activeDocuments: myDocuments.length,
        };

        const payload: DashboardSummaryResponse = {
            kpis,
            recentMachines: myMachines.slice(0, 6),
            recentActivity: myAuditLogs as RecentActivityRow[],
            generatedAt: new Date().toISOString(),
        };

        return res.status(200).json(payload);
    } catch (error: any) {
        console.error("Dashboard summary API error:", error);
        return res.status(500).json({
            error: error?.message || "Internal server error",
        });
    }
}

export default withAuth(
    ["owner", "admin", "supervisor", "technician", "viewer"],
    handler,
    { allowPlatformAdmin: true }
);

