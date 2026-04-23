import { apiFetch } from "@/services/apiClient";

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

export const checklistAssignmentApi = {
    list: () => apiFetch < ChecklistAssignmentDashboardData > ("/api/checklists/assignments"),
    create: (params: { template_id: string; machine_id: string }) =>
        apiFetch < ChecklistAssignmentListItem > ("/api/checklists/assignments", {
            method: "POST",
            body: JSON.stringify(params),
        }),
    deactivate: (assignmentId: string) =>
        apiFetch < { success: true } > ("/api/checklists/assignments", {
            method: "DELETE",
            body: JSON.stringify({ assignment_id: assignmentId }),
        }),
};
