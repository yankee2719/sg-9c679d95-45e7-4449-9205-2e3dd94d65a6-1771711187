import { apiFetch } from "@/services/apiClient";

export interface WorkOrderPayload {
    title?: string | null;
    description?: string | null;
    status?: string | null;
    priority?: string | null;
    due_date?: string | null;
    machine_id?: string | null;
    assigned_to?: string | null;
    plant_id?: string | null;
    work_type?: string | null;
    created_by?: string | null;
}

export async function listWorkOrders() {
    return apiFetch<any[]>("/api/work-orders");
}

export async function getWorkOrder(id: string) {
    return apiFetch<any>(`/api/work-orders/${id}`);
}

export async function createWorkOrder(payload: WorkOrderPayload) {
    return apiFetch<any>("/api/work-orders", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateWorkOrder(id: string, payload: WorkOrderPayload) {
    return apiFetch<any>(`/api/work-orders/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}