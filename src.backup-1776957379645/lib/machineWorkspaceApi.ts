import { apiFetch } from "@/services/apiClient";
import { authService } from "@/services/authService";

export async function listMachineCatalog() {
    return apiFetch<any>("/api/machines/catalog");
}

export async function getMachineSnapshot(machineId: string) {
    return apiFetch<any>(`/api/machines/${machineId}/snapshot`);
}

export async function getMachineMaintenanceContext(machineId: string) {
    return apiFetch<any>(`/api/machines/${machineId}/maintenance-context`);
}

export async function getMachineDocumentsContext(machineId: string) {
    return apiFetch<any>(`/api/machines/${machineId}/documents-context`);
}

export async function getMachine(machineId: string) {
    return apiFetch<any>(`/api/machines/${machineId}`);
}

export async function createMachine(payload: Record<string, any>) {
    return apiFetch<any>("/api/machines", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateMachine(machineId: string, payload: Record<string, any>) {
    return apiFetch<any>(`/api/machines/${machineId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function getPlantsContext() {
    return apiFetch<any>("/api/plants");
}

export async function uploadMachinePhoto(machineId: string, file: File) {
    const session = await authService.getCurrentSession();
    if (!session?.access_token) throw new Error("Authentication required.");

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/machines/${machineId}/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Upload error");
    return payload as { photo_url: string | null };
}

export async function removeMachinePhoto(machineId: string) {
    return apiFetch<{ photo_url: string | null }>(`/api/machines/${machineId}/photo`, { method: "DELETE" });
}
