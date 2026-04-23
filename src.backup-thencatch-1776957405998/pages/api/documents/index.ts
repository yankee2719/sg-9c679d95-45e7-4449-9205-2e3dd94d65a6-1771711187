import type { NextApiResponse } from "next";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function getAccessibleMachineIds(req: AuthenticatedRequest, serviceSupabase: ReturnType<typeof getServiceSupabase>) {
    const orgId = req.user.organizationId;
    if (!orgId) return [] as string[];

    const [{ data: ownMachines, error: ownMachinesError }, { data: customerAssignments, error: customerAssignmentsError }, { data: manufacturerAssignments, error: manufacturerAssignmentsError }] = await Promise.all([
        serviceSupabase
            .from("machines")
            .select("id")
            .eq("organization_id", orgId)
            .eq("is_archived", false)
            .or("is_deleted.is.null,is_deleted.eq.false"),
        serviceSupabase
            .from("machine_assignments")
            .select("machine_id")
            .eq("customer_org_id", orgId)
            .eq("is_active", true),
        serviceSupabase
            .from("machine_assignments")
            .select("machine_id")
            .eq("manufacturer_org_id", orgId)
            .eq("is_active", true),
    ]);

    if (ownMachinesError) throw ownMachinesError;
    if (customerAssignmentsError) throw customerAssignmentsError;
    if (manufacturerAssignmentsError) throw manufacturerAssignmentsError;

    return Array.from(new Set([
        ...(ownMachines ?? []).map((row: any) => row.id),
        ...(customerAssignments ?? []).map((row: any) => row.machine_id),
        ...(manufacturerAssignments ?? []).map((row: any) => row.machine_id),
    ].filter(Boolean)));
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed", allowedMethods: ["GET"] });
    }

    try {
        if (!req.user.organizationId) {
            return res.status(400).json({ error: "No active organization context" });
        }

        const serviceSupabase = getServiceSupabase();
        const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
        const category = typeof req.query.category === "string" ? req.query.category.trim() : "";

        const accessibleMachineIds = await getAccessibleMachineIds(req, serviceSupabase);

        const ownDocsPromise = serviceSupabase
            .from("documents")
            .select("id, title, description, category, language, regulatory_reference, machine_id, organization_id, version_count, file_size, updated_at, created_at, is_archived, tags")
            .eq("organization_id", req.user.organizationId)
            .eq("is_archived", false)
            .order("updated_at", { ascending: false });

        const machineDocsPromise = accessibleMachineIds.length > 0
            ? serviceSupabase
                .from("documents")
                .select("id, title, description, category, language, regulatory_reference, machine_id, organization_id, version_count, file_size, updated_at, created_at, is_archived, tags")
                .in("machine_id", accessibleMachineIds)
                .eq("is_archived", false)
                .order("updated_at", { ascending: false })
            : Promise.resolve({ data: [], error: null } as any);

        const [{ data: ownDocs, error: ownDocsError }, machineDocsRes] = await Promise.all([ownDocsPromise, machineDocsPromise]);
        if (ownDocsError) throw ownDocsError;
        if (machineDocsRes.error) throw machineDocsRes.error;

        const merged = new Map<string, any>();
        for (const row of ownDocs ?? []) merged.set(row.id, row);
        for (const row of machineDocsRes.data ?? []) merged.set(row.id, row);

        let documents = Array.from(merged.values());

        if (category) {
            documents = documents.filter((doc) => doc.category === category);
        }

        if (search) {
            documents = documents.filter((doc) => {
                const haystack = [doc.title, doc.description, doc.regulatory_reference, ...(Array.isArray(doc.tags) ? doc.tags : [])]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return haystack.includes(search);
            });
        }

        const machineIds = Array.from(new Set(documents.map((doc) => doc.machine_id).filter(Boolean))) as string[];
        let machineMap = new Map<string, string>();
        if (machineIds.length > 0) {
            const { data: machines, error: machinesError } = await serviceSupabase
                .from("machines")
                .select("id, name, internal_code")
                .in("id", machineIds);
            if (machinesError) throw machinesError;
            machineMap = new Map((machines ?? []).map((row: any) => [row.id, row.name || row.internal_code || row.id]));
        }

        const payload = documents.sort((a, b) => {
            const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return db - da;
        }).map((doc) => ({
            ...doc,
            machine_label: doc.machine_id ? machineMap.get(doc.machine_id) ?? doc.machine_id : null,
        }));

        const stats = {
            total: payload.length,
            categories: payload.reduce((acc: Record<string, number>, doc: any) => {
                const key = doc.category || "other";
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {}),
        };

        return res.status(200).json({ success: true, documents: payload, stats });
    } catch (error) {
        console.error("Documents index API error:", error);
        return res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
