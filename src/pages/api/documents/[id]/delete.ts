import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Invalid document ID" });
        }

        if (!req.user.organizationId) {
            return res.status(400).json({ error: "No active organization context" });
        }

        const serviceSupabase = getServiceSupabase();

        const { data: doc, error: docError } = await serviceSupabase
            .from("documents")
            .select("id, title, organization_id, is_archived, machine_id")
            .eq("id", id)
            .maybeSingle();

        if (docError) {
            return res.status(500).json({ error: docError.message });
        }

        if (!doc) {
            return res.status(404).json({ error: "Document not found" });
        }

        if (!req.user.isPlatformAdmin && doc.organization_id !== req.user.organizationId) {
            return res.status(403).json({ error: "Document does not belong to active organization" });
        }

        if (doc.is_archived) {
            return res.status(200).json({
                success: true,
                message: "Document already archived",
                document_id: doc.id,
            });
        }

        const now = new Date().toISOString();

        const { error: updateError } = await serviceSupabase
            .from("documents")
            .update({
                is_archived: true,
                updated_at: now,
            } as any)
            .eq("id", doc.id);

        if (updateError) {
            return res.status(500).json({ error: updateError.message });
        }

        await serviceSupabase
            .from("audit_logs")
            .insert({
                organization_id: req.user.organizationId,
                actor_user_id: req.user.id,
                entity_type: "document",
                entity_id: doc.id,
                action: "soft_delete",
                machine_id: doc.machine_id,
                metadata: {
                    document_title: doc.title,
                    trash_system: true,
                    archived_flag: true,
                },
                new_data: {
                    is_archived: true,
                },
            } as any)
            .then(() => undefined)
            .catch((err) => {
                console.error("Audit log insert failed:", err);
            });

        return res.status(200).json({
            success: true,
            message: "Document moved to trash successfully",
            document_id: doc.id,
        });
    } catch (error) {
        console.error("Unexpected error in /api/documents/[id]/delete:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default withAuth(["owner", "admin", "supervisor"], handler, {
    requireAal2: true,
    allowPlatformAdmin: true,
});