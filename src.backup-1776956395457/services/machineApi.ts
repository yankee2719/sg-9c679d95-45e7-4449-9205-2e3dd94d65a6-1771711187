import { apiFetch } from "@/services/apiClient";

export async function listMachines() {
    return apiFetch < any[] > ("/api/machines");
}

export async function getMachine(id: string) {
    return apiFetch < any > (`/api/machines/${id}`);
}

export async function createMachine(payload: any) {
    return apiFetch < any > ("/api/machines", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateMachine(id: string, payload: any) {
    return apiFetch < any > (`/api/machines/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}