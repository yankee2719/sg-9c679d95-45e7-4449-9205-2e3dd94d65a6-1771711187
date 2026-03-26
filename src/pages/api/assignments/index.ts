import { apiFetch } from "@/services/apiClient";

export interface PlantRow {
    id: string;
    name: string | null;
    code: string | null;
    organization_id: string;
}

export interface LineRow {
    id: string;
    name: string | null;
    code: string | null;
    plant_id: string | null;
    organization_id?: string | null;
}

export interface MachineRow {
    id: string;
    name: string | null;
    internal_code: string | null;
    lifecycle_state?: string | null;
    plant_id: string | null;
    production_line_id: string | null;
}

export interface PlantsOverviewResponse {
    plants: PlantRow[];
    lines: LineRow[];
    machines: MachineRow[];
}

export interface PlantDetailResponse {
    plant: PlantRow | null;
    lines: LineRow[];
    machines: MachineRow[];
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

export async function listPlantsOverview() {
    return apiFetch<PlantsOverviewResponse>("/api/plants");
}

export async function getPlantDetail(id: string) {
    return apiFetch<PlantDetailResponse>(`/api/plants/${id}`);
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
    return apiFetch<LineRow>("/api/production-lines", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
