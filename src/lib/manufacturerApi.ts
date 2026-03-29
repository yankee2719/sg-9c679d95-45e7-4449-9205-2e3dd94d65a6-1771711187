import { authService } from "@/services/authService";

export interface Manufacturer {
    id: string;
    organization_id?: string;
    name: string;
    country: string | null;
    website: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
    is_archived: boolean | null;
}

export interface ManufacturerPayload {
    name: string;
    country?: string | null;
    website?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
}

async function authHeaders(includeJson = true): Promise<Record<string, string>> {
    const session = await authService.getCurrentSession();
    if (!session?.access_token) {
        throw new Error("Authentication required.");
    }

    return {
        Authorization: `Bearer ${session.access_token}`,
        ...(includeJson ? { "Content-Type": "application/json" } : {}),
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

export const manufacturerApi = {
    async list(): Promise<Manufacturer[]> {
        const response = await fetch("/api/manufacturers", {
            method: "GET",
            headers: await authHeaders(false),
        });
        return parseResponse < Manufacturer[] > (response);
    },

    async create(payload: ManufacturerPayload): Promise<Manufacturer> {
        const response = await fetch("/api/manufacturers", {
            method: "POST",
            headers: await authHeaders(true),
            body: JSON.stringify(payload),
        });
        return parseResponse < Manufacturer > (response);
    },

    async update(id: string, payload: ManufacturerPayload): Promise<Manufacturer> {
        const response = await fetch(`/api/manufacturers/${id}`, {
            method: "PATCH",
            headers: await authHeaders(true),
            body: JSON.stringify(payload),
        });
        return parseResponse < Manufacturer > (response);
    },

    async remove(id: string): Promise<void> {
        const response = await fetch(`/api/manufacturers/${id}`, {
            method: "DELETE",
            headers: await authHeaders(false),
        });
        await parseResponse < void> (response);
    },
};
