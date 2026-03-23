// ============================================================================
// API: GET /api/documents/[id]/access
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import { getDocumentService } from "@/services/documentService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res
            .status(405)
            .json({ error: "Method not allowed", allowedMethods: ["GET"] });
    }

    const { id } = req.query;

    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Document ID is required" });
    }

    try {
        const docService = getDocumentService();
        const serviceSupabase = getServiceSupabase();

        const hasPermission = await docService.checkUserPermission(
            req.user.userId,
            id,
            "view"
        );

        if (!hasPermission) {
            return res.status(403).json({
                error: "Access denied - View permission required",
            });
        }

        const { data: grants, error: grantsError } = await serviceSupabase
            .from("document_access_grants")
            .select(
                `id, document_id, granted_to_role, granted_to_user_id, permission_level,
                 granted_by, granted_at, expires_at, is_active, grant_reason, created_at`
            )
            .eq("document_id", id)
            .eq("is_active", true)
            .order("granted_at", { ascending: false });

        if (grantsError) {
            throw grantsError;
        }

        const enrichedGrants = await Promise.all(
            (grants || []).map(async (grant) => {
                const { data: grantedByUser } = await serviceSupabase
                    .from("profiles")
                    .select("full_name, email")
                    .eq("id", grant.granted_by)
                    .single();

                let grantedToUser = null;
                if (grant.granted_to_user_id) {
                    const { data } = await serviceSupabase
                        .from("profiles")
                        .select("full_name, email")
                        .eq("id", grant.granted_to_user_id)
                        .single();
                    grantedToUser = data;
                }

                const isExpired = grant.expires_at
                    ? new Date(grant.expires_at) < new Date()
                    : false;

                return {
                    ...grant,
                    granted_by_name: grantedByUser?.full_name || null,
                    granted_by_email: grantedByUser?.email || null,
                    granted_to_user_name: grantedToUser?.full_name || null,
                    granted_to_user_email: grantedToUser?.email || null,
                    is_expired: isExpired,
                };
            })
        );

        const stats = {
            total: enrichedGrants.length,
            byPermissionLevel: {} as Record<string, number>,
            byGrantType: { role: 0, user: 0 },
            expired: 0,
            active: 0,
        };

        enrichedGrants.forEach((grant) => {
            stats.byPermissionLevel[grant.permission_level] =
                (stats.byPermissionLevel[grant.permission_level] || 0) + 1;

            if (grant.granted_to_role) {
                stats.byGrantType.role++;
            } else {
                stats.byGrantType.user++;
            }

            if (grant.is_expired) {
                stats.expired++;
            } else {
                stats.active++;
            }
        });

        return res.status(200).json({
            success: true,
            grants: enrichedGrants,
            stats,
        });
    } catch (error) {
        console.error("Access Grants List API Error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to retrieve access grants",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
