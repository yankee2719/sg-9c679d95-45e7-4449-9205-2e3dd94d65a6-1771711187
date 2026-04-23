import { getServiceSupabase, type AuthenticatedRequest } from "@/lib/apiAuth";

export interface AccessibleDocumentRow {
    id: string;
    title: string | null;
    description: string | null;
    category: string | null;
    language: string | null;
    regulatory_reference: string | null;
    machine_id: string | null;
    organization_id: string | null;
    version_count: number | null;
    file_size: number | null;
    updated_at: string | null;
    created_at: string | null;
    is_archived: boolean | null;
    external_url?: string | null;
    storage_bucket?: string | null;
    storage_path?: string | null;
}

async function getAccessibleMachineIds(req: AuthenticatedRequest): Promise<string[]> {
    const serviceSupabase = getServiceSupabase();
    const orgId = req.user.organizationId;

    if (!orgId) return [];

    if (req.user.organizationType === "manufacturer") {
        const { data, error } = await serviceSupabase
            .from("machine_assignments")
            .select("machine_id")
            .eq("manufacturer_org_id", orgId)
            .eq("is_active", true);

        if (error) throw error;
        return Array.from(new Set((data ?? []).map((row: any) => row.machine_id).filter(Boolean)));
    }

    const [{ data: ownMachines, error: ownError }, { data: assigned, error: assignedError }] = await Promise.all([
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
    ]);

    if (ownError) throw ownError;
    if (assignedError) throw assignedError;

    return Array.from(
        new Set([
            ...(ownMachines ?? []).map((row: any) => row.id),
            ...(assigned ?? []).map((row: any) => row.machine_id),
        ].filter(Boolean))
    );
}

export async function listAccessibleDocuments(req: AuthenticatedRequest): Promise<AccessibleDocumentRow[]> {
    const serviceSupabase = getServiceSupabase();
    const orgId = req.user.organizationId;

    if (!orgId) return [];

    const querySelect = "id, title, description, category, language, regulatory_reference, machine_id, organization_id, version_count, file_size, updated_at, created_at, is_archived, external_url, storage_bucket, storage_path";

    if (req.user.organizationType === "manufacturer") {
        const { data, error } = await serviceSupabase
            .from("documents")
            .select(querySelect)
            .eq("organization_id", orgId)
            .eq("is_archived", false)
            .order("updated_at", { ascending: false });

        if (error) throw error;
        return (data ?? []) as AccessibleDocumentRow[];
    }

    const accessibleMachineIds = await getAccessibleMachineIds(req);

    const [{ data: orgDocs, error: orgDocsError }, machineDocsResult] = await Promise.all([
        serviceSupabase
            .from("documents")
            .select(querySelect)
            .eq("organization_id", orgId)
            .eq("is_archived", false)
            .order("updated_at", { ascending: false }),
        accessibleMachineIds.length > 0
            ? serviceSupabase
                .from("documents")
                .select(querySelect)
                .in("machine_id", accessibleMachineIds)
                .eq("is_archived", false)
                .order("updated_at", { ascending: false })
            : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (orgDocsError) throw orgDocsError;
    if (machineDocsResult.error) throw machineDocsResult.error;

    const merged = new Map<string, AccessibleDocumentRow>();
    for (const row of orgDocs ?? []) merged.set((row as any).id, row as AccessibleDocumentRow);
    for (const row of machineDocsResult.data ?? []) merged.set((row as any).id, row as AccessibleDocumentRow);

    return Array.from(merged.values()).sort((a, b) => {
        const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return db - da;
    });
}

export async function getAccessibleDocumentById(req: AuthenticatedRequest, documentId: string): Promise<AccessibleDocumentRow | null> {
    const docs = await listAccessibleDocuments(req);
    return docs.find((doc) => doc.id === documentId) ?? null;
}

