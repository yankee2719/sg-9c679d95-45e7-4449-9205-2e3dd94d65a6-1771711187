import { apiFetch } from "@/services/apiClient";

export type ExportEntity =
    | "machines"
    | "work-orders"
    | "documents"
    | "customers"
    | "users"
    | "assignments";

export async function exportEntity(entity: ExportEntity) {
    try {
        const response = await fetch(`/api/export/${entity}`, {
            headers: await buildAuthHeaders(),
        });

        if (!response.ok) {
            let message = "Export failed";
            try {
                const err = await response.json();
                message = err?.error || message;
            } catch {}
            throw new Error(message);
        }

        const blob = await response.blob();

        // 👉 naming serio (non timestamp random)
        const date = new Date().toISOString().slice(0, 10);
        const filename = `${entity}_${date}.csv`;

        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        console.error("Export error:", error);
        throw error;
    }
}

async function buildAuthHeaders() {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();

    return data.session?.access_token
        ? { Authorization: `Bearer ${data.session.access_token}` }
        : {};
}