import { apiFetch } from "@/services/apiClient";

export type DocumentScope = "manufacturer" | "customer";

export interface DocumentPermissionResult {
    canRead: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canUploadVersion: boolean;
    canSign: boolean;
    reason?: string | null;
}

export async function getDocumentPermissions(args: {
    machineId?: string | null;
    scope: DocumentScope;
    createdByOrgId?: string | null;
}): Promise<DocumentPermissionResult> {
    if (!args.machineId) {
        return {
            canRead: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canUploadVersion: false,
            canSign: false,
            reason: "Macchina non valida.",
        };
    }

    try {
        const params = new URLSearchParams({ scope: args.scope });
        if (args.createdByOrgId) {
            params.set("createdByOrgId", args.createdByOrgId);
        }

        const response = await apiFetch < { permissions?: DocumentPermissionResult } > (
            `/api/machines/${args.machineId}/document-permissions?${params.toString()}`
        );

        if (response?.permissions) {
            return response.permissions;
        }

        return {
            canRead: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canUploadVersion: false,
            canSign: false,
            reason: "Permessi documento non disponibili.",
        };
    } catch (error) {
        return {
            canRead: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canUploadVersion: false,
            canSign: false,
            reason:
                error instanceof Error
                    ? error.message
                    : "Impossibile verificare i permessi documento.",
        };
    }
}
