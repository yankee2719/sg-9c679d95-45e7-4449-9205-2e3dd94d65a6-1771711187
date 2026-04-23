import {
    listMachines,
    getMachine,
    createMachine as createMachineViaApi,
    updateMachine as updateMachineViaApi,
} from "@/services/machineApi";
import { apiFetch } from "@/services/apiClient";

export interface EquipmentRecord {
    id: string;
    name: string;
    internal_code?: string | null;
    serial_number?: string | null;
    model?: string | null;
    brand?: string | null;
    organization_id?: string | null;
    plant_id?: string | null;
    production_line_id?: string | null;
    lifecycle_state?: string | null;
    notes?: string | null;
    is_archived?: boolean | null;
    photo_url?: string | null;
    created_at?: string;
    updated_at?: string;
}

export async function listMachinesForActiveOrganization(): Promise<EquipmentRecord[]> {
    return (await listMachines()) as EquipmentRecord[];
}

export async function getMachineById(machineId: string): Promise<EquipmentRecord | null> {
    if (!machineId) return null;
    return (await getMachine(machineId)) as EquipmentRecord | null;
}

export async function createMachine(payload: Partial<EquipmentRecord>): Promise<EquipmentRecord> {
    return (await createMachineViaApi(payload)) as EquipmentRecord;
}

export async function updateMachine(
    machineId: string,
    payload: Partial<EquipmentRecord>
): Promise<EquipmentRecord> {
    return (await updateMachineViaApi(machineId, payload)) as EquipmentRecord;
}

export async function archiveMachine(machineId: string): Promise<void> {
    await apiFetch(`/api/machines/${machineId}/delete`, {
        method: "DELETE",
    });
}

const equipmentService = {
    listMachinesForActiveOrganization,
    getMachineById,
    createMachine,
    updateMachine,
    archiveMachine,
};

export default equipmentService;
