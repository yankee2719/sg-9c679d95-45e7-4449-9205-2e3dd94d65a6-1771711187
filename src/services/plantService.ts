import { apiFetch } from "@/services/apiClient";

export interface PlantRow {
    id: string;
    name: string | null;
    code: string | null;
    organization_id: string;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface ProductionLineRow {
    id: string;
    name: string | null;
    code: string | null;
    plant_id: string | null;
    organization_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface PlantMachineRow {
    id: string;
    name: string | null;
    internal_code: string | null;
    lifecycle_state: string | null;
    plant_id: string | null;
    production_line_id: string | null;
    organization_id?: string | null;
}

export interface PlantSummary extends PlantRow {
    lines: ProductionLineRow[];
    lines_count: number;
    machines_count: number;
}

export interface PlantDetail {
    plant: PlantRow;
    lines: ProductionLineRow[];
    machines: PlantMachineRow[];
}

export interface PlantPayload {
    name: string;
    code?: string | null;
}

export interface ProductionLinePayload {
    plant_id: string;
    name: string;
    code?: string | null;
}

export async function listPlants() {
    return apiFetch<PlantSummary[]>("/api/plants");
}

export async function getPlant(id: string) {
    return apiFetch<PlantDetail>(`/api/plants/${id}`);
}

export async function createPlant(payload: PlantPayload) {
    return apiFetch<PlantRow>("/api/plants", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updatePlant(id: string, payload: PlantPayload) {
    return apiFetch<PlantRow>(`/api/plants/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export async function createProductionLine(payload: ProductionLinePayload) {
    return apiFetch<ProductionLineRow>("/api/production-lines", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
