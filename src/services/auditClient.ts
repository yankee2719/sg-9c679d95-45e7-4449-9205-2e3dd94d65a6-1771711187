import { apiFetch } from "@/services/apiClient";

export async function logAudit(params: {
    organizationId: string;
    entityType: string;
    entityId?: string | null;
    action: string;
    machineId?: string | null;
    documentId?: string | null;
    metadata?: any;
    newData?: any;
    oldData?: any;
}) {
    try {
        await apiFetch("/api/audit-log", {
            method: "POST",
            body: JSON.stringify(params),
        });
    } catch (error) {
        console.warn("Audit log failed (non-blocking):", error);
    }
}