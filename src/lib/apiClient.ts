import { authService } from "@/services/authService";

/**
 * API Client (CLEAN)
 * - Removed legacy endpoints: /api/equipment, /api/checklists, /api/maintenance/schedules
 * - Use Supabase client + RLS for: machines, checklist_templates, checklist_assignments, maintenance_plans, etc.
 * - Keep ONLY server-only routes that make sense (users/notifications/stripe etc.)
 */

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
    message?: string;
    details?: unknown;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    sort?: string;
    order?: "asc" | "desc";
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
        const session = await authService.getCurrentSession();
        if (!session) {
            return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
        }

        const headers: Record<string, string> = {
            Authorization: `Bearer ${session.access_token}`,
            ...(options.headers as Record<string, string>),
        };

        if (options.body && typeof options.body === "string") {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(endpoint, { ...options, headers });

        if (response.status === 204) {
            return { success: true, data: undefined };
        }

        // Some APIs may return empty body on errors; guard JSON parse
        let payload: any = null;
        const text = await response.text();
        if (text) {
            try {
                payload = JSON.parse(text);
            } catch {
                payload = { message: text };
            }
        }

        if (!response.ok) {
            return {
                success: false,
                error: payload?.error || payload?.message || `API error: ${response.status}`,
                code: payload?.code,
                message: payload?.message,
                details: payload?.details,
            };
        }

        return {
            success: true,
            data: payload?.data ?? payload,
            pagination: payload?.pagination,
        };
    } catch (error) {
        console.error("API request failed:", error);
        return { success: false, error: "Network error", code: "NETWORK_ERROR" };
    }
}

// Build query string from params
function buildQuery(params: Record<string, unknown>): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
            query.append(key, String(value));
        }
    }
    return query.toString() ? `?${query.toString()}` : "";
}

// =====================
// Notifications API (optional)
// =====================
export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: "info" | "warning" | "error" | "success";
    link?: string;
    is_read: boolean;
    created_at: string;
}

export const notificationApi = {
    list: (params: { page?: number; limit?: number; is_read?: boolean; type?: string } = {}) =>
        fetchApi < Notification[] > (`/api/notifications${buildQuery(params)}`),

    get: (id: string) => fetchApi < Notification > (`/api/notifications/${id}`),

    markAsRead: (id: string) =>
        fetchApi < Notification > (`/api/notifications/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ is_read: true }),
        }),

    markAllAsRead: () =>
        fetchApi < { message: string } > ("/api/notifications", {
            method: "PATCH",
        }),

    delete: (id: string) =>
        fetchApi < void> (`/api/notifications/${id}`, {
            method: "DELETE",
        }),
};

// =====================
// Users API (server-only operations)
// =====================
export interface User {
    id: string;
    email: string;
    full_name?: string;
    role: "admin" | "supervisor" | "technician";
    avatar_url?: string;
    is_active: boolean;
    tenant_id?: string; // legacy naming in API payloads; ok to keep if your route returns it
    created_at?: string;
    updated_at?: string;
}

// Response of /api/users/create
export interface CreateUserResponse {
    message: string;
    user: {
        id: string;
        email: string;
        full_name?: string;
        role: "admin" | "supervisor" | "technician";
        phone?: string;
    };
}

export const userApi = {
    list: () => fetchApi < User[] > ("/api/users/list"),

    create: (data: { email: string; password: string; full_name?: string; role: User["role"] }) =>
        fetchApi < CreateUserResponse > ("/api/users/create", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<User>) =>
        fetchApi < User > (`/api/users/${id}/update`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        fetchApi < void> (`/api/users/${id}/delete`, {
            method: "DELETE",
        }),

    me: () => fetchApi < User > ("/api/profiles/me"),
};

// =====================
// Legacy export (kept only for places that import apiClient.*)
// =====================
export const apiClient = {
    users: userApi,
    notifications: notificationApi,
    profile: {
        me: userApi.me,
    },
};