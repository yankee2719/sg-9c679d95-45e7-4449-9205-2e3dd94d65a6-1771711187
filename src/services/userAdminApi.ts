import { apiFetch } from "@/services/apiClient";

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const payload = await apiFetch < any > (url, options);
    return (payload?.data ?? payload) as T;
}

export interface UserAdminRow {
    id: string;
    membership_id: string;
    email: string;
    display_name: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    role: "owner" | "admin" | "supervisor" | "technician" | "viewer";
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
    machine: { id: string; name: string | null; internal_code: string | null; serial_number: string | null; model: string | null; brand: string | null } | null;
    customer: { id: string; name: string | null; city: string | null; email: string | null } | null;
    assigned_user: { id: string; display_name: string | null; first_name: string | null; last_name: string | null; email: string | null } | null;
}

export interface AssignmentOptions {
    machines: Array<{ id: string; name: string | null; internal_code: string | null; serial_number: string | null; model: string | null; brand: string | null }>;
    customers: Array<{ id: string; name: string | null; city: string | null; email: string | null }>;
}

export const userAdminApi = {
    listUsers: () => request < UserAdminRow[] > ("/api/users"),
    updateUser: (membershipId: string, body: Record<string, unknown>) => request(`/api/users/${membershipId}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteUser: (membershipId: string) => request(`/api/users/${membershipId}`, { method: "DELETE" }),
    createUser: (body: Record<string, unknown>) => request("/api/users", { method: "POST", body: JSON.stringify(body) }),
    listAssignments: () => request < AssignmentListItem[] > ("/api/assignments"),
    getAssignmentOptions: () => request < AssignmentOptions > ("/api/assignments?options=1"),
    createAssignment: (body: Record<string, unknown>) => request("/api/assignments", { method: "POST", body: JSON.stringify(body) }),
    deleteAssignment: (assignment_id: string) => request("/api/assignments", { method: "DELETE", body: JSON.stringify({ assignment_id }) }),
};
