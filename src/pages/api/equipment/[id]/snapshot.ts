import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function resolveMachineAccess(req: AuthenticatedRequest, machineId: string) {
    const supabase = getServiceSupabase();
    const organizationId = req.user.organizationId;
    const organizationType = req.user.organizationType;

    if (!organizationId || !organizationType) {
        return { error: "No active organization context", status: 400 as const, supabase };
    }

    const { data: machine, error: machineError } = await supabase
        .from("machines")
        .select("*")
        .eq("id", machineId)
        .eq("is_archived", false)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .maybeSingle();

    if (machineError) throw machineError;
    if (!machine) {
        return { error: "Machine not found", status: 404 as const, supabase };
    }

    let allowed = false;
    if (req.user.isPlatformAdmin) {
        allowed = true;
    } else if (organizationType === "manufacturer") {
        allowed = machine.organization_id === organizationId;
    } else if (machine.organization_id === organizationId) {
        allowed = true;
    } else {
        const { data: assignment, error: assignmentError } = await supabase
            .from("machine_assignments")
            .select("id")
            .eq("machine_id", machineId)
            .eq("customer_org_id", organizationId)
            .eq("is_active", true)
            .maybeSingle();
        if (assignmentError) throw assignmentError;
        allowed = !!assignment;
    }

    if (!allowed) {
        return { error: "Access denied", status: 403 as const, supabase };
    }

    return { machine, organizationId, organizationType, supabase };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const machineId = typeof req.query.id === "string" ? req.query.id : "";
    if (!machineId) {
        return res.status(400).json({ error: "Missing machine id" });
    }

    try {
        const access = await resolveMachineAccess(req, machineId);
        if ("error" in access) {
            return res.status(access.status).json({ error: access.error });
        }

        const { machine, supabase, organizationType } = access;

        const [plantRes, lineRes, ownerOrgRes, assignmentRes, workOrdersRes, documentsRes] = await Promise.all([
            machine.plant_id
                ? supabase.from("plants").select("id, name, code").eq("id", machine.plant_id).maybeSingle()
                : Promise.resolve({ data: null, error: null } as any),
            machine.production_line_id
                ? supabase.from("production_lines").select("id, name, code").eq("id", machine.production_line_id).maybeSingle()
                : Promise.resolve({ data: null, error: null } as any),
            machine.organization_id
                ? supabase.from("organizations").select("id, name").eq("id", machine.organization_id).maybeSingle()
                : Promise.resolve({ data: null, error: null } as any),
            supabase
                .from("machine_assignments")
                .select("id, customer_org_id, organizations:customer_org_id(id, name)")
                .eq("machine_id", machine.id)
                .eq("is_active", true)
                .maybeSingle(),
            supabase
                .from("work_orders")
                .select("id, title, status, priority, due_date, created_at")
                .eq("machine_id", machine.id)
                .order("created_at", { ascending: false })
                .limit(10),
            supabase
                .from("documents")
                .select("id, title, category, updated_at, file_size")
                .eq("machine_id", machine.id)
                .eq("is_archived", false)
                .order("updated_at", { ascending: false })
                .limit(20),
        ]);

        for (const candidate of [plantRes, lineRes, ownerOrgRes, assignmentRes, workOrdersRes, documentsRes]) {
            if (candidate?.error) {
                throw candidate.error;
            }
        }

        return res.status(200).json({
            success: true,
            snapshot: {
                machine,
                plant: plantRes.data ?? null,
                line: lineRes.data ?? null,
                ownerOrganization: ownerOrgRes.data ?? null,
                assignedCustomerName: (assignmentRes.data as any)?.organizations?.name ?? null,
                workOrders: workOrdersRes.data ?? [],
                documents: documentsRes.data ?? [],
                machineContext: {
                    canEdit: req.user.isPlatformAdmin || (["owner", "admin", "supervisor"].includes(req.user.role) && machine.organization_id === req.user.organizationId),
                    canDelete: req.user.isPlatformAdmin || (["owner", "admin", "supervisor"].includes(req.user.role) && machine.organization_id === req.user.organizationId),
                    userRole: req.user.role,
                    orgType: organizationType,
                },
                generatedAt: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        console.error("Equipment snapshot API error:", error);
        return res.status(500).json({ error: error?.message || "Internal server error" });
    }
}

export default withAuth(["owner", "admin", "supervisor", "technician", "viewer"], handler, { allowPlatformAdmin: true });
