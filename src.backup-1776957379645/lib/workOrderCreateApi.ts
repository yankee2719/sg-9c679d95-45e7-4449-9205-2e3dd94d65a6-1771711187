import { apiFetch } from "@/services/apiClient";

export interface WorkOrderCreateContextMachine {
    id: string;
    name: string;
    internal_code: string | null;
    plant_id: string | null;
}

export interface WorkOrderCreateContextAssignee {
    id: string;
    display_name: string;
    email: string | null;
}

export async function getWorkOrderCreateContext(): Promise<{
    machines: WorkOrderCreateContextMachine[];
    assignees: WorkOrderCreateContextAssignee[];
}> {
    return apiFetch<{ machines: WorkOrderCreateContextMachine[]; assignees: WorkOrderCreateContextAssignee[] }>(
        "/api/work-orders/create-context"
    );
}
