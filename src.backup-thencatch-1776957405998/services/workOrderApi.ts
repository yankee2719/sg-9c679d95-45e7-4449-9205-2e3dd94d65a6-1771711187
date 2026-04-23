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
    maintenance_plan_id?: string | null;
}

function unwrapResponse<T>(payload: any): T {
    if (payload && typeof payload === "object") {
        if (payload.data !== undefined) return payload.data as T;
        if (payload.workOrder !== undefined) return payload.workOrder as T;
    }
    return payload as T;
}

export async function listWorkOrders() {
    const payload = await apiFetch<any>("/api/work-orders");
    return Array.isArray(payload) ? payload : unwrapResponse<any[]>(payload);
}

export async function getWorkOrder(id: string) {
    const payload = await apiFetch<any>(`/api/work-orders/${id}`);
    return unwrapResponse<any>(payload);
}

export async function createWorkOrder(payload: WorkOrderPayload) {
    const response = await apiFetch<any>("/api/work-orders", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return unwrapResponse<any>(response);
}

export async function updateWorkOrder(id: string, payload: WorkOrderPayload) {
    const response = await apiFetch<any>(`/api/work-orders/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    return unwrapResponse<any>(response);
}
