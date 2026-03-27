import { authService } from "@/services/authService";

export interface ChecklistAssignmentTemplateOption {
    id: string;
    name: string;
    target_type: string;
    version: number;
}

export interface ChecklistAssignmentMachineOption {
    id: string;
    name: string;
    internal_code: string | null;
    organization_id: string | null;
}

export interface ChecklistAssignmentListItem {
    id: string;
    organization_id: string;
    template_id: string;
    machine_id: string | null;
    production_line_id: string | null;
    is_active: boolean | null;
    created_at: string | null;
    template: ChecklistAssignmentTemplateOption | null;
    machine: ChecklistAssignmentMachineOption | null;
}

export interface ChecklistAssignmentDashboardData {
    templates: ChecklistAssignmentTemplateOption[];
    machines: ChecklistAssignmentMachineOption[];
    assignments: ChecklistAssignmentListItem[];
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

export const checklistAssignmentApi = {
    async list(): Promise<ChecklistAssignmentDashboardData> {
        const response = await fetch("/api/checklists/assignments", {
            method: "GET",
            headers: await authHeaders(),
        });
        return parseResponse < ChecklistAssignmentDashboardData > (response);
    },

    async create(params: { template_id: string; machine_id: string }): Promise<ChecklistAssignmentListItem> {
        const response = await fetch("/api/checklists/assignments", {
            method: "POST",
            headers: await authHeaders(),
            body: JSON.stringify(params),
        });
        return parseResponse < ChecklistAssignmentListItem > (response);
    },

    async deactivate(assignmentId: string): Promise<{ success: true }> {
        const response = await fetch("/api/checklists/assignments", {
            method: "DELETE",
            headers: await authHeaders(),
            body: JSON.stringify({ assignment_id: assignmentId }),
        });
        return parseResponse < { success: true } > (response);
    },
};

