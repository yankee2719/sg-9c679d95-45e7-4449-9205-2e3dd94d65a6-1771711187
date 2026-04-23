import { authService } from "@/services/authService";

async function authHeaders(): Promise<Record<string, string>> {
    const session = await authService.getCurrentSession();
    if (!session?.access_token) {
        throw new Error("Authentication required.");
    }

    return {
        Authorization: `Bearer ${session.access_token}`,
    };
}

export async function uploadChecklistExecutionPhotos(
    executionId: string,
    itemId: string,
    files: File[]
): Promise<string[]> {
    if (!executionId) throw new Error("Execution id is required.");
    if (!itemId) throw new Error("Checklist item id is required.");
    if (!files.length) return [];

    const formData = new FormData();
    formData.append("itemId", itemId);
    for (const file of files) {
        formData.append("files", file);
    }

    const response = await fetch(`/api/checklists/executions/${executionId}/photos`, {
        method: "POST",
        headers: await authHeaders(),
        body: formData,
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `API error ${response.status}`);
    }

    return Array.isArray(payload?.data?.paths) ? payload.data.paths : [];
}
