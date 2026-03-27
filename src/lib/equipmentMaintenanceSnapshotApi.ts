import { authService } from "@/services/authService";

export interface MaintenanceSnapshotMachine {
    id: string;
    organization_id: string;
    name: string;
    internal_code: string | null;
    serial_number: string | null;
    plant_id: string | null;
    production_line_id: string | null;
}

export interface MaintenanceSnapshotWorkOrder {
    id: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    created_at: string;
}

export interface MaintenanceSnapshotChecklist {
    id: string;
    template_id: string;
    is_active: boolean | null;
    template?: { id: string; name: string; version: number | null } | null;
}

export interface MaintenanceSnapshotData {
    machine: MaintenanceSnapshotMachine;
    workOrders: MaintenanceSnapshotWorkOrder[];
    checklists: MaintenanceSnapshotChecklist[];
}

const STORAGE_PREFIX = "machina:maintenance-snapshot:";

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

export async function fetchEquipmentMaintenanceSnapshot(machineId: string): Promise<MaintenanceSnapshotData> {
    const response = await fetch(`/api/equipment/${machineId}/maintenance-snapshot`, {
        method: "GET",
        headers: await authHeaders(),
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
        throw new Error(payload?.error || `API error ${response.status}`);
    }
    return (payload?.data ?? payload) as MaintenanceSnapshotData;
}

export function saveEquipmentMaintenanceSnapshot(machineId: string, data: MaintenanceSnapshotData) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
        `${STORAGE_PREFIX}${machineId}`,
        JSON.stringify({ data, cachedAt: new Date().toISOString() })
    );
}

export function loadEquipmentMaintenanceSnapshot(machineId: string): { data: MaintenanceSnapshotData; cachedAt: string } | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${machineId}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.data) return null;
        return {
            data: parsed.data as MaintenanceSnapshotData,
            cachedAt: typeof parsed.cachedAt === "string" ? parsed.cachedAt : new Date().toISOString(),
        };
    } catch {
        return null;
    }
}

