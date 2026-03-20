import { apiFetch } from "@/services/apiClient";

export type ExportEntity =
    | "machines"
    | "work-orders"
    | "documents"
    | "customers"
    | "users"
    | "assignments";

export async function exportEntity(entity: ExportEntity) {
    const response = await fetch(`/api/export/${entity}`, {
        headers: await buildAuthHeaders(),
    });

    if (!response.ok) {
        let message = "Export failed";
        try {
            const err = await response.json();
            message = err?.error || message;
        } catch {
            // ignore
        }
        throw new Error(message);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${entity}_${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
}

async function buildAuthHeaders() {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}