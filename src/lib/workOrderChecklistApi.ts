import { authService } from "@/services/authService";

export interface WorkOrderChecklistTemplateItem {
    id: string;
    title: string;
    description: string | null;
    input_type: string;
    is_required: boolean;
    order_index: number;
    metadata: Record<string, any>;
}

export interface WorkOrderChecklistAssignmentContext {
    id: string;
    template_id: string;
    machine_id: string | null;
    production_line_id: string | null;
    is_active: boolean | null;
    template: {
        id: string;
        name: string;
        version: number;
        is_active: boolean;
    } | null;
    items: WorkOrderChecklistTemplateItem[];
}

export interface WorkOrderChecklistContext {
    workOrder: {
        id: string;
        organization_id: string;
        machine_id: string | null;
        title: string;
        status: string | null;
    };
    assignments: WorkOrderChecklistAssignmentContext[];
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

export const workOrderChecklistApi = {
    async getContext(workOrderId: string): Promise<WorkOrderChecklistContext> {
        const response = await fetch(`/api/work-orders/${workOrderId}/checklist-context`, {
            method: "GET",
            headers: await authHeaders(),
        });
        return parseResponse < WorkOrderChecklistContext > (response);
    },
};


