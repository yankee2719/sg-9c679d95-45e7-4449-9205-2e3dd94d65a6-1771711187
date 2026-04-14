import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

export default withAuth(
    ALL_APP_ROLES,
    async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        try {
            const {
                organizationId,
                entityType,
                entityId,
                action,
                machineId,
                documentId,
                metadata,
                newData,
                oldData,
            } = req.body ?? {};

            if (!organizationId || !entityType || !action) {
                return res.status(400).json({
                    error: "Missing required fields",
                });
            }

            if (req.user.organizationId && req.user.organizationId !== organizationId) {
                return res.status(403).json({
                    error: "Organization mismatch",
                });
            }

            const actorUserId =
                (req as any)?.user?.userId ??
                (req as any)?.user?.id ??
                null;

            const serviceSupabase = getServiceSupabase();

            const { error } = await serviceSupabase.from("audit_logs").insert({
                organization_id: organizationId,
                actor_user_id: actorUserId,
                entity_type: entityType,
                entity_id: entityId ?? null,
                action,
                machine_id: machineId ?? null,
                document_id: documentId ?? null,
                metadata: metadata ?? {},
                new_data: newData ?? null,
                old_data: oldData ?? null,
            });

            if (error) {
                console.error("Audit log insert error:", error);
                return res.status(500).json({
                    error: error.message || "Failed to write audit log",
                });
            }

            return res.status(200).json({ success: true });
        } catch (error: any) {
            console.error("Unexpected audit log API error:", error);
            return res.status(500).json({
                error: error?.message || "Internal server error",
            });
        }
    },
    { allowPlatformAdmin: true }
);