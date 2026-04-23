export interface EquipmentSnapshotMachine {
    id: string;
    name: string | null;
    internal_code: string | null;
    serial_number: string | null;
    model: string | null;
    brand: string | null;
    notes: string | null;
    lifecycle_state: string | null;
    organization_id: string | null;
    plant_id: string | null;
    production_line_id: string | null;
    photo_url?: string | null;
    created_at?: string | null;
}

export interface EquipmentSnapshot {
    machine: EquipmentSnapshotMachine;
    plant: { id: string; name: string | null; code?: string | null } | null;
    line: { id: string; name: string | null; code?: string | null } | null;
    ownerOrganization: { id: string; name: string | null } | null;
    assignedCustomerName: string | null;
    workOrders: Array<{ id: string; title: string; status: string; priority: string; due_date: string | null; created_at: string | null }>;
    documents: Array<{ id: string; title: string | null; category: string | null; updated_at: string | null; file_size: number | null }>;
    machineContext: {
        canEdit: boolean;
        canDelete: boolean;
        userRole: string;
        orgType: "manufacturer" | "customer" | "enterprise" | "enterprise";
    };
    generatedAt: string;
}

const PREFIX = "machina.equipment.snapshot.";

function storageKey(machineId: string) {
    return `${PREFIX}${machineId}`;
}

export function saveEquipmentSnapshot(snapshot: EquipmentSnapshot) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey(snapshot.machine.id), JSON.stringify(snapshot));
}

export function getEquipmentSnapshot(machineId: string): EquipmentSnapshot | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(storageKey(machineId));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}
