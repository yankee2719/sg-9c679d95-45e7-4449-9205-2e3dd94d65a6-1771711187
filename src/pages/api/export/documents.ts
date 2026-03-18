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

        let documents: any[] = [];

        if (activeOrg.type === "manufacturer") {
            const { data, error } = await serviceSupabase
                .from("documents")
                .select(
                    "id, title, description, category, language, regulatory_reference, machine_id, organization_id, version_count, file_size, created_at, updated_at"
                )
                .eq("organization_id", orgId)
                .eq("is_archived", false)
                .order("updated_at", { ascending: false });

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            documents = data ?? [];
        } else {
            const [{ data: ownMachines, error: ownMachinesError }, { data: assignments, error: assignmentsError }] =
                await Promise.all([
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

            if (ownMachinesError) {
                return res.status(500).json({ error: ownMachinesError.message });
            }

            if (assignmentsError) {
                return res.status(500).json({ error: assignmentsError.message });
            }

            const accessibleMachineIds = Array.from(
                new Set([
                    ...(ownMachines ?? []).map((row: any) => row.id),
                    ...(assignments ?? []).map((row: any) => row.machine_id),
                ].filter(Boolean))
            );

            const [{ data: orgDocs, error: orgDocsError }, machineDocsRes] = await Promise.all([
                serviceSupabase
                    .from("documents")
                    .select(
                        "id, title, description, category, language, regulatory_reference, machine_id, organization_id, version_count, file_size, created_at, updated_at"
                    )
                    .eq("organization_id", orgId)
                    .eq("is_archived", false)
                    .order("updated_at", { ascending: false }),
                accessibleMachineIds.length > 0
                    ? serviceSupabase
                        .from("documents")
                        .select(
                            "id, title, description, category, language, regulatory_reference, machine_id, organization_id, version_count, file_size, created_at, updated_at"
                        )
                        .in("machine_id", accessibleMachineIds)
                        .eq("is_archived", false)
                        .order("updated_at", { ascending: false })
                    : Promise.resolve({ data: [], error: null } as any),
            ]);

            if (orgDocsError) {
                return res.status(500).json({ error: orgDocsError.message });
            }

            if (machineDocsRes.error) {
                return res.status(500).json({ error: machineDocsRes.error.message });
            }

            const merged = new Map < string, any> ();
            for (const row of orgDocs ?? []) merged.set(row.id, row);
            for (const row of machineDocsRes.data ?? []) merged.set(row.id, row);

            documents = Array.from(merged.values());
        }

        const machineIds = Array.from(
            new Set(documents.map((row: any) => row.machine_id).filter(Boolean))
        );

        let machineMap = new Map < string, string> ();
        if (machineIds.length > 0) {
            const { data: machines, error: machinesError } = await serviceSupabase
                .from("machines")
                .select("id, name, internal_code")
                .in("id", machineIds);

            if (machinesError) {
                return res.status(500).json({ error: machinesError.message });
            }

            machineMap = new Map(
                (machines ?? []).map((row: any) => [
                    row.id,
                    row.name || row.internal_code || row.id,
                ])
            );
        }

        const header = [
            "id",
            "title",
            "description",
            "category",
            "language",
            "regulatory_reference",
            "machine_id",
            "machine_label",
            "organization_id",
            "version_count",
            "file_size",
            "created_at",
            "updated_at",
        ];

        const csv = [
            header.join(","),
            ...documents.map((row: any) =>
                [
                    csvEscape(row.id),
                    csvEscape(row.title),
                    csvEscape(row.description),
                    csvEscape(row.category),
                    csvEscape(row.language),
                    csvEscape(row.regulatory_reference),
                    csvEscape(row.machine_id),
                    csvEscape(row.machine_id ? machineMap.get(row.machine_id) ?? row.machine_id : ""),
                    csvEscape(row.organization_id),
                    csvEscape(row.version_count),
                    csvEscape(row.file_size),
                    csvEscape(row.created_at),
                    csvEscape(row.updated_at),
                ].join(",")
            ),
        ].join("\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="documents-export.csv"'
        );
        return res.status(200).send(csv);
    } catch (error: any) {
        console.error("Unexpected error in /api/export/documents:", error);
        return res.status(500).json({ error: error?.message ?? "Internal server error" });
    }
}

export default withAuth(
    ["owner", "admin", "supervisor", "technician", "viewer"],
    handler,
    { allowPlatformAdmin: true }
);