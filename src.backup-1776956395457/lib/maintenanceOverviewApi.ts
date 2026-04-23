import { apiFetch } from "@/services/apiClient";

export interface MaintenanceOverviewItem {
    id: string;
    title: string | null;
    machine_id: string | null;
    machine_name: string | null;
    due_date: string | null;
    priority: string | null;
    status: string | null;
    created_at: string | null;
}

export async function getMaintenanceOverview(): Promise<{ items: MaintenanceOverviewItem[] }> {
    return apiFetch < { items: MaintenanceOverviewItem[] } > ("/api/maintenance/overview");
}
