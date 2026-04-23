import { authService } from "@/services/authService";

export interface ChecklistExecutionListItem {
    id: string;
    assignment_id: string | null;
    organization_id: string;
    work_order_id: string | null;
    machine_id: string | null;
    executed_by: string;
    executed_at: string;
    completed_at: string | null;
    overall_status: string | null;
    notes: string | null;
    template_version: number;
    template_name: string | null;
    machine_name: string | null;
    machine_code: string | null;
    plant_id: string | null;
    plant_name: string | null;
    work_order_title: string | null;
    executed_by_name: string | null;
}

export interface ChecklistExecutionDetail {
    execution: {
        id: string;
        assignment_id: string | null;
        organization_id: string;
        work_order_id: string | null;
        machine_id: string | null;
        executed_by: string;
        executed_at: string;
        completed_at: string | null;
        overall_status: string | null;
        notes: string | null;
        template_version: number;
        checklist_id?: string | null;
    };
    assignment: any;
    template: {
        id: string;
        name: string;
        description?: string | null;
        version?: number | null;
        target_type?: string | null;
    } | null;
    items: Array<{
        id: string;
        title: string;
        description: string | null;
        input_type: string;
        is_required: boolean;
        order_index: number;
        metadata?: any;
        answer?: {
            id: string;
            template_item_id: string;
            value: string | null;
            notes: string | null;
            photos: string[];
        } | null;
    }>;
    machine: { id: string; name: string; internal_code?: string | null; plant_id?: string | null } | null;
    workOrder: { id: string; title: string; status?: string | null; assigned_to?: string | null } | null;
    technician: { id: string; display_name: string | null; email: string | null } | null;
}

async function authHeaders() {
    const session = await authService.getCurrentSession();
    if (!session?.access_token) {
        throw new Error("Authentication required.");
    }

    return {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
    };
}

async function parseResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `API error ${response.status}`);
    }

    return (payload?.data ?? payload) as T;
}

export const checklistExecutionApi = {
    async list(): Promise<ChecklistExecutionListItem[]> {
        const response = await fetch("/api/checklists/executions", {
            method: "GET",
            headers: await authHeaders(),
        });
        return parseResponse < ChecklistExecutionListItem[] > (response);
    },

    async get(id: string): Promise<ChecklistExecutionDetail> {
        const response = await fetch(`/api/checklists/executions/${id}`, {
            method: "GET",
            headers: await authHeaders(),
        });
        return parseResponse < ChecklistExecutionDetail > (response);
    },

    async create(params: { assignment_id: string; work_order_id?: string | null }): Promise<{ id: string }> {
        const response = await fetch("/api/checklists/executions", {
            method: "POST",
            headers: await authHeaders(),
            body: JSON.stringify(params),
        });
        return parseResponse < { id: string } > (response);
    },

    async complete(
        id: string,
        params: {
            items: Array<{
                template_item_id: string;
                value?: string | null;
                notes?: string | null;
                photos?: string[];
            }>;
            notes?: string | null;
            overall_status?: "pending" | "passed" | "failed" | "partial" | null;
        }
    ): Promise<ChecklistExecutionDetail> {
        const response = await fetch(`/api/checklists/executions/${id}`, {
            method: "PATCH",
            headers: await authHeaders(),
            body: JSON.stringify(params),
        });
        return parseResponse < ChecklistExecutionDetail > (response);
    },
};
