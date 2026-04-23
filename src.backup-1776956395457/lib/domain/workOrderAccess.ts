import { apiFetch } from "@/services/apiClient";

export interface WorkOrderAccess {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canAssign: boolean;
    canExecute: boolean;
    canClose: boolean;
    reason?: string | null;
}

export async function getWorkOrderAccess(machineId: string): Promise<WorkOrderAccess> {
    if (!machineId) {
        return {
            canView: false,
            canCreate: false,
            canEdit: false,
            canAssign: false,
            canExecute: false,
            canClose: false,
            reason: "Macchina non valida.",
        };
    }

    try {
        const response = await apiFetch < { access?: WorkOrderAccess } > (
            `/api/machines/${machineId}/work-order-access`
        );

        if (response?.access) {
            return response.access;
        }

        return {
            canView: false,
            canCreate: false,
            canEdit: false,
            canAssign: false,
            canExecute: false,
            canClose: false,
            reason: "Accesso non disponibile.",
        };
    } catch (error) {
        return {
            canView: false,
            canCreate: false,
            canEdit: false,
            canAssign: false,
            canExecute: false,
            canClose: false,
            reason:
                error instanceof Error ? error.message : "Impossibile verificare i permessi work order.",
        };
    }
}
