import type { NextApiResponse } from "next";
import {
    ALL_APP_ROLES,
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import { getMachineVisibilityForUser } from "@/lib/server/machineVisibilityService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const machineId = typeof req.query.id === "string" ? req.query.id : "";
    const scope = `${req.query.scope ?? ""}`.trim().toLowerCase();
    const createdByOrgId = typeof req.query.createdByOrgId === "string"
        ? req.query.createdByOrgId
        : null;

    if (!machineId) {
        return res.status(400).json({ error: "Missing machine id" });
    }

    if (scope !== "manufacturer" && scope !== "customer") {
        return res.status(400).json({ error: "Invalid scope" });
    }

    try {
        const visibility = await getMachineVisibilityForUser(
            getServiceSupabase(),
            req.user,
            machineId
        );

        if (!visibility?.machine) {
            return res.status(404).json({ error: "Machine not found" });
        }

        if (!visibility.canView) {
            return res.status(403).json({ error: "Access denied" });
        }

        const isAdminLike = ["owner", "admin", "supervisor"].includes(req.user.role);
        const isCreatorOrg = !!createdByOrgId && createdByOrgId === req.user.organizationId;

        if (scope === "manufacturer") {
            if (req.user.organizationType === "manufacturer") {
                const canRead =
                    isCreatorOrg || visibility.isAssignedManufacturer || visibility.isOwner;
                const canManage =
                    isAdminLike &&
                    (isCreatorOrg || visibility.isAssignedManufacturer || visibility.isOwner);

                return res.status(200).json({
                    permissions: {
                        canRead,
                        canCreate: isAdminLike,
                        canEdit: canManage,
                        canDelete: canManage,
                        canUploadVersion: canManage,
                        canSign: canManage,
                        reason: canManage
                            ? null
                            : "Documento costruttore gestibile solo dall'organizzazione costruttrice.",
                    },
                });
            }

            return res.status(200).json({
                permissions: {
                    canRead: visibility.isOwner || visibility.isAssignedCustomer,
                    canCreate: false,
                    canEdit: false,
                    canDelete: false,
                    canUploadVersion: false,
                    canSign: false,
                    reason: "Il cliente finale può solo consultare i documenti costruttore.",
                },
            });
        }

        if (req.user.organizationType === "customer") {
            const canManage = visibility.isOwner && (isAdminLike || req.user.role === "technician");
            return res.status(200).json({
                permissions: {
                    canRead: visibility.isOwner || visibility.isAssignedCustomer,
                    canCreate: canManage,
                    canEdit: canManage,
                    canDelete: isAdminLike && visibility.isOwner,
                    canUploadVersion: canManage,
                    canSign: isAdminLike && visibility.isOwner,
                    reason: canManage
                        ? null
                        : "Documento operativo cliente gestibile solo dall'organizzazione proprietaria.",
                },
            });
        }

        return res.status(200).json({
            permissions: {
                canRead: visibility.isAssignedManufacturer || isCreatorOrg,
                canCreate: false,
                canEdit: false,
                canDelete: false,
                canUploadVersion: false,
                canSign: false,
                reason: "Il costruttore non modifica i documenti operativi del cliente.",
            },
        });
    } catch (error) {
        console.error("Machine document permissions API error:", error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler, { allowPlatformAdmin: true });
