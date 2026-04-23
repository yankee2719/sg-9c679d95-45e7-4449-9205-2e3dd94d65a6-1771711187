import { apiFetch } from "@/services/apiClient";

export type ChecklistTemplateInputType = "boolean" | "text" | "number" | "value";

export interface ChecklistTemplateCatalogRow {
    id: string;
    name: string | null;
    description: string | null;
    target_type: string | null;
    version: number | null;
    is_active: boolean | null;
    created_at: string | null;
    item_count: number;
}

export interface ChecklistTemplateDetailItem {
    id: string;
    title: string | null;
    description: string | null;
    input_type: ChecklistTemplateInputType;
    is_required: boolean | null;
    order_index: number | null;
}

export interface ChecklistTemplateDetail {
    id: string;
    name: string | null;
    description: string | null;
    target_type: string | null;
    version: number | null;
    is_active: boolean | null;
    created_at: string | null;
    items: ChecklistTemplateDetailItem[];
}

export interface SaveChecklistTemplatePayload {
    template_id?: string | null;
    name: string;
    description?: string | null;
    target_type: "machine" | "production_line";
    is_active: boolean;
    items: Array<{
        title: string;
        description?: string | null;
        input_type: ChecklistTemplateInputType;
        is_required: boolean;
        order_index: number;
    }>;
}

export interface SaveChecklistTemplateResult {
    template_id: string;
    created_new_version: boolean;
}

// Hard fix: call the real singular routes that already exist in the project.
// This avoids the legacy 410/Gone path /api/checklists/[id] swallowing "templates".
export const checklistTemplateApi = {
    list: () => apiFetch<{ rows: ChecklistTemplateCatalogRow[] }>("/api/checklists/template"),
    get: (id: string) => apiFetch<ChecklistTemplateDetail>(`/api/checklists/template/${id}`),
    save: (payload: SaveChecklistTemplatePayload) =>
        apiFetch<SaveChecklistTemplateResult>("/api/checklists/template/save", {
            method: "POST",
            body: JSON.stringify(payload),
        }),
};
