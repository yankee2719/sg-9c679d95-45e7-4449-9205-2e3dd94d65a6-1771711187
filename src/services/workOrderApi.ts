import { apiFetch } from "@/services/apiClient";

export async function listWorkOrders() {
    return apiFetch < any[] > ("/api/work-orders");
}

export async function getWorkOrder(id: string) {
    return apiFetch < any > (`/api/work-orders/${id}`);
}

export async function createWorkOrder(payload: any) {
    return apiFetch < any > ("/api/work-orders", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateWorkOrder(id: string, payload: any) {
    return apiFetch < any > (`/api/work-orders/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}