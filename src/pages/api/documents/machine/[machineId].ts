import type { NextApiResponse } from "next";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { hasMinimumCompatibleRole } from "@/lib/roles";
import { canAttachToMachine } from "@/lib/server/documentWorkflow";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const machineId = typeof req.query.machineId === "string" ? req.query.machineId : "";
    if (!machineId) {
        return res.status(400).json({ error: "Machine ID is required" });
    }

    try {
        const access = await canAttachToMachine(req, machineId);
        if (!access.allowed && !req.user.isPlatformAdmin) {
            return res.status(403).json({ error: "Access denied for target machine" });
        }

        const { data, error } = await access.serviceSupabase
            .from("documents")
            .select(`
                id,
                organization_id,
                machine_id,
                title,
                description,
                category,
                language,
                regulatory_reference,
                current_version_id,
                version_count,
                file_size,
                updated_at,
                is_archived,
                document_versions:document_versions!document_versions_document_id_fkey (
                    id,
                    document_id,
                    version_number,
                    file_name,
                    file_path,
                    file_size,
                    mime_type,
                    checksum_sha256,
                    change_summary,
                    created_at,
                    created_by
                )
            `)
            .eq("machine_id", machineId)
            .eq("is_archived", false)
            .order("updated_at", { ascending: false });

        if (error) throw error;

        const canManage = req.user.isPlatformAdmin || hasMinimumCompatibleRole(req.user.role, "supervisor");
        const rows = (data ?? []).map((row: any) => ({
            ...row,
            can_manage: canManage && (req.user.isPlatformAdmin || row.organization_id === req.user.organizationId),
            document_versions: (row.document_versions ?? []).sort((a: any, b: any) => (b.version_number ?? 0) - (a.version_number ?? 0)),
        }));

        return res.status(200).json({ success: true, data: rows });
    } catch (error: any) {
        console.error("Machine documents API error:", error);
        return res.status(500).json({ error: error?.message || "Failed to load machine documents" });
    }
}

export default withAuth(ALL_APP_ROLES, handler, { allowPlatformAdmin: true });
