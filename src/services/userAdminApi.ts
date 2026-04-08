import { authService } from "@/services/authService";

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const session = await authService.getCurrentSession();
    if (!session) throw new Error("Not authenticated");

    const headers: Record<string, string> = {
        Authorization: `Bearer ${session.access_token}`,
    };

    if (options.body) headers["Content-Type"] = "application/json";

    const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `API error: ${response.status}`);
    }

    return (payload?.data ?? payload) as T;
}

export type CurrentUserRole = "admin" | "supervisor" | "technician";

export interface UserAdminRow {
    id: string;
    membership_id: string;
    email: string;
    display_name: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    role: CurrentUserRole;
    is_active: boolean;
    created_at?: string | null;
    accepted_at?: string | null;
}

export interface AssignmentListItem {
    id: string;
    machine_id: string;
    customer_org_id: string | null;
    manufacturer_org_id: string;
    assigned_by: string | null;
    assigned_at: string | null;
    is_active: boolean;
    machine: {
        id: string;
        name: string | null;
        internal_code: string | null;
        serial_number: string | null;
        model: string | null;
        brand: string | null;
        plant_id: string | null;
        area: string | null;
    } | null;
    machine_plant: {
        id: string;
        name: string | null;
        organization_id: string | null;
    } | null;
    customer: {
        id: string;
        name: string | null;
        city: string | null;
        email: string | null;
    } | null;
    assigned_user: {
        id: string;
        display_name: string | null;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
    } | null;
}

export interface AssignmentOptions {
    machines: Array<{
        id: string;
        name: string | null;
        internal_code: string | null;
        serial_number: string | null;
        model: string | null;
        brand: string | null;
        plant_id: string | null;
        area: string | null;
    }>;
    customers: Array<{
        id: string;
        name: string | null;
        city: string | null;
        email: string | null;
    }>;
    customer_plants: Array<{
        id: string;
        name: string | null;
        organization_id: string | null;
    }>;
}

export const userAdminApi = {
    listUsers: () => request < UserAdminRow[] > ("/api/users"),
    updateUser: (membershipId: string, body: Record<string, unknown>) =>
        request(`/api/users/${membershipId}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteUser: (membershipId: string) => request(`/api/users/${membershipId}`, { method: "DELETE" }),
    createUser: (body: Record<string, unknown>) => request("/api/users", { method: "POST", body: JSON.stringify(body) }),
    listAssignments: () => request < AssignmentListItem[] > ("/api/machine-assignments"),
    getAssignmentOptions: () => request < AssignmentOptions > ("/api/machine-assignments?options=1"),
    createAssignment: (body: Record<string, unknown>) =>
        request("/api/machine-assignments", { method: "POST", body: JSON.stringify(body) }),
    deleteAssignment: (assignment_id: string) =>
        request("/api/machine-assignments", { method: "DELETE", body: JSON.stringify({ assignment_id }) }),
};

