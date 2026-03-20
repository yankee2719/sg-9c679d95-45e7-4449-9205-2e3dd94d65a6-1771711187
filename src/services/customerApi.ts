import { apiFetch } from "@/services/apiClient";

export async function listCustomers() {
    return apiFetch < any[] > ("/api/customers");
}

export async function getCustomer(id: string) {
    return apiFetch < any > (`/api/customers/${id}`);
}

export async function createCustomer(payload: any) {
    return apiFetch < any > ("/api/customers", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateCustomer(id: string, payload: any) {
    return apiFetch < any > (`/api/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}