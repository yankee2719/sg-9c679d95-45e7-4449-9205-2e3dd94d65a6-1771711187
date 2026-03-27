import { apiFetch } from "@/services/apiClient";

export interface WorkOrderChecklistContextItem {
    id: string;
    title: string;
    description: string | null;
    input_type: string;
    is_required: boolean;
    order_index: number;
    metadata: any;
}

export interface WorkOrderChecklistAssignment {
    id: string;
    template_id: string;
    machine_id: string | null;
    production_line_id: string | null;
    organization_id: string;
    is_active: boolean;
    template: {
        id: string;
        name: string;
        version: number;
        is_active: boolean;
    };
    template_items: WorkOrderChecklistContextItem[];
}

export interface WorkOrderChecklistContext {
    workOrder: {
        id: string;
        title: string;
        organization_id: string;
        machine_id: string | null;
    };
    assignments: WorkOrderChecklistAssignment[];
}

export async function getWorkOrderChecklistContext(workOrderId: string): Promise<WorkOrderChecklistContext> {
    return apiFetch < WorkOrderChecklistContext > (`/api/work-orders/${workOrderId}/checklist-context`);
}
