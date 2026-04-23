import type { NextApiResponse } from "next";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function resolveAccess(req: AuthenticatedRequest, documentId: string, serviceSupabase: ReturnType<typeof getServiceSupabase>) {
    const { data: document, error } = await serviceSupabase
        .from("documents")
        .select("id, title, description, category, language, regulatory_reference, machine_id, organization_id, version_count, file_size, updated_at, created_at, is_archived, external_url, storage_bucket, storage_path, mime_type, tags, created_by")
        .eq("id", documentId)
        .maybeSingle();

    if (error) throw error;
    if (!document) return { document: null, canView: false, canManage: false };

    const orgId = req.user.organizationId;
    const isOwnerOrg = !!orgId && document.organization_id === orgId;
    let isAssigned = false;

    if (document.machine_id && orgId) {
        const { data: assignments, error: assignmentsError } = await serviceSupabase
            .from("machine_assignments")
            .select("manufacturer_org_id, customer_org_id")
            .eq("machine_id", document.machine_id)
            .eq("is_active", true);
        if (assignmentsError) throw assignmentsError;
        isAssigned = (assignments ?? []).some((row: any) => row.manufacturer_org_id === orgId || row.customer_org_id === orgId);
    }

    const canView = req.user.isPlatformAdmin || isOwnerOrg || isAssigned;
    const canManage = req.user.isPlatformAdmin || (isOwnerOrg && ["owner", "admin", "supervisor"].includes(req.user.role));

    return { document, canView, canManage };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const documentId = typeof req.query.id === "string" ? req.query.id : "";
    if (!documentId) {
        return res.status(400).json({ error: "Missing document id" });
    }

    const serviceSupabase = getServiceSupabase();

    try {
        const access = await resolveAccess(req, documentId, serviceSupabase);
        if (!access.document) {
            return res.status(404).json({ error: "Document not found" });
        }
        if (!access.canView) {
            return res.status(403).json({ error: "Access denied" });
        }

        if (req.method === "GET") {
            let machine = null;
            if (access.document.machine_id) {
                const { data } = await serviceSupabase
                    .from("machines")
                    .select("id, name, internal_code")
                    .eq("id", access.document.machine_id)
                    .maybeSingle();
                machine = data ?? null;
            }

            return res.status(200).json({
                success: true,
                document: {
                    ...access.document,
                    machine_label: machine ? machine.name || machine.internal_code || machine.id : null,
                    can_manage: access.canManage,
                },
            });
        }

        if (req.method === "PATCH") {
            if (!access.canManage) {
                return res.status(403).json({ error: "Manage permission required" });
            }

            const { title, description, category, language, regulatory_reference, tags } = req.body ?? {};
            const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (typeof title === "string") patch.title = title.trim();
            if (typeof description === "string") patch.description = description.trim() || null;
            if (typeof category === "string") patch.category = category;
            if (typeof language === "string") patch.language = language;
            if (typeof regulatory_reference === "string") patch.regulatory_reference = regulatory_reference.trim() || null;
            if (Array.isArray(tags)) patch.tags = tags;

            const { data: updatedDocument, error: updateError } = await serviceSupabase
                .from("documents")
                .update(patch as any)
                .eq("id", documentId)
                .select("*")
                .single();

            if (updateError) {
                return res.status(500).json({ error: updateError.message });
            }

            return res.status(200).json({ success: true, document: updatedDocument });
        }

        if (req.method === "DELETE") {
            if (!access.canManage) {
                return res.status(403).json({ error: "Manage permission required" });
            }

            const { error: updateError } = await serviceSupabase
                .from("documents")
                .update({ is_archived: true, updated_at: new Date().toISOString() } as any)
                .eq("id", documentId);

            if (updateError) {
                return res.status(500).json({ error: updateError.message });
            }

            return res.status(200).json({ success: true, archived: true });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        console.error("Document detail API error:", error);
        return res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
