import { authService } from "@/services/authService";

/**
 * API Client for Next.js API endpoints with full CRUD support
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

async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    try {
        // Get current session token
        const session = await authService.getCurrentSession();
        if (!session) {
            return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
        }

        // Build headers
        const headers: Record<string, string> = {
            Authorization: `Bearer ${session.access_token}`,
            ...(options.headers as Record<string, string>),
        };

        // Add Content-Type for non-GET requests with body
        if (options.body && typeof options.body === "string") {
            headers["Content-Type"] = "application/json";
        }

        // Make API request
        const response = await fetch(endpoint, {
            ...options,
            headers,
        });

        // Handle 204 No Content
        if (response.status === 204) {
            return { success: true, data: undefined };
        }

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || data.message || `API error: ${response.status}`,
                code: data.code,
                message: data.message,
                details: data.details,
            };
        }

        return {
            success: true,
            data: data.data,
            pagination: data.pagination,
        };
    } catch (error) {
        console.error("API request failed:", error);
        return {
            success: false,
            error: "Network error",
            code: "NETWORK_ERROR",
        };
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
// Equipment API
// =====================
export interface Equipment {
    id: string;
    name: string;
    equipment_code: string;
    category: string;
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    location?: string;
    status: "active" | "inactive" | "under_maintenance" | "decommissioned";
    purchase_date?: string;
    warranty_expiry?: string;
    notes?: string;
    image_url?: string;
    qr_code?: string;
    tenant_id?: string;
    created_at?: string;
    updated_at?: string;
}

export interface EquipmentListParams extends PaginationParams {
    search?: string;
    category?: string;
    status?: string;
    location?: string;
}

export const equipmentApi = {
    list: (params: EquipmentListParams = {}) =>
        fetchApi < Equipment[] > (`/api/equipment${buildQuery(params)}`),

    get: (id: string) =>
        fetchApi < Equipment > (`/api/equipment/${id}`),

    create: (data: Partial<Equipment>) =>
        fetchApi < Equipment > ("/api/equipment", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<Equipment>) =>
        fetchApi < Equipment > (`/api/equipment/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        fetchApi < void> (`/api/equipment/${id}`, {
            method: "DELETE",
        }),

    generateQrCode: (id: string) =>
        fetchApi < { qr_code: string; equipment: Equipment } > (
            `/api/equipment/${id}/generate-qr`,
            { method: "POST" }
        ),
};

// =====================
// Checklist API
// =====================
export interface ChecklistItem {
    id: string;
    checklist_id: string;
    title: string;
    description?: string;
    input_type: "checkbox" | "text" | "number" | "photo" | "signature" | "select";
    is_required: boolean;
    order_index: number;
    images?: string[];
    created_at?: string;
}

export interface Checklist {
    id: string;
    name: string;
    description?: string;
    category?: string;
    is_active: boolean;
    items?: ChecklistItem[];
    tenant_id?: string;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ChecklistListParams extends PaginationParams {
    search?: string;
    category?: string;
    is_active?: boolean;
    include_items?: boolean;
}

export const checklistApi = {
    list: (params: ChecklistListParams = {}) =>
        fetchApi < Checklist[] > (`/api/checklists${buildQuery(params)}`),

    get: (id: string) =>
        fetchApi < Checklist > (`/api/checklists/${id}`),

    create: (data: { name: string; description?: string; category?: string; is_active?: boolean; items?: Partial<ChecklistItem>[] }) =>
        fetchApi < Checklist > ("/api/checklists", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<Checklist> & { items?: Partial<ChecklistItem>[] }) =>
        fetchApi < Checklist > (`/api/checklists/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        fetchApi < void> (`/api/checklists/${id}`, {
            method: "DELETE",
        }),

    // Items
    getItems: (checklistId: string) =>
        fetchApi < ChecklistItem[] > (`/api/checklists/${checklistId}/items`),

    addItem: (checklistId: string, item: Partial<ChecklistItem>) =>
        fetchApi < ChecklistItem > (`/api/checklists/${checklistId}/items`, {
            method: "POST",
            body: JSON.stringify(item),
        }),

    reorderItems: (checklistId: string, items: { id: string; order_index: number }[]) =>
        fetchApi < ChecklistItem[] > (`/api/checklists/${checklistId}/items`, {
            method: "PUT",
            body: JSON.stringify({ items }),
        }),
};

// =====================
// Checklist Execution API
// =====================
export interface ChecklistExecution {
    id: string;
    checklist_id: string;
    executed_by: string;
    status: "pending" | "in_progress" | "completed" | "cancelled";
    started_at?: string;
    completed_at?: string;
    results?: Record<string, unknown>;
    notes?: string;
    signature?: string;
    schedule_id?: string;
    maintenance_log_id?: string;
    tenant_id?: string;
    checklist?: Checklist;
    executor?: { id: string; full_name: string; email: string };
    created_at?: string;
}

export interface ExecutionListParams extends PaginationParams {
    checklist_id?: string;
    equipment_id?: string;
    executed_by?: string;
    status?: string;
    from_date?: string;
    to_date?: string;
}

export const executionApi = {
    list: (params: ExecutionListParams = {}) =>
        fetchApi < ChecklistExecution[] > (`/api/checklists/executions${buildQuery(params)}`),

    get: (id: string) =>
        fetchApi < ChecklistExecution > (`/api/checklists/executions/${id}`),

    start: (data: { checklist_id: string; equipment_id?: string; schedule_id?: string }) =>
        fetchApi < ChecklistExecution > ("/api/checklists/executions", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    update: (id: string, data: { status?: string; results?: Record<string, unknown>; notes?: string; signature?: string }) =>
        fetchApi < ChecklistExecution > (`/api/checklists/executions/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),

    complete: (id: string, data: { results?: Record<string, unknown>; notes?: string; signature?: string }) =>
        fetchApi < ChecklistExecution > (`/api/checklists/executions/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ ...data, status: "completed" }),
        }),

    cancel: (id: string) =>
        fetchApi < void> (`/api/checklists/executions/${id}`, {
            method: "DELETE",
        }),
};

// =====================
// Maintenance API
// =====================
export interface MaintenanceSchedule {
    id: string;
    equipment_id: string;
    title: string;
    description?: string;
    frequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "custom";
    next_due_date: string;
    last_completed?: string;
    assigned_to?: string;
    checklist_id?: string;
    priority?: "low" | "medium" | "high" | "critical";
    estimated_duration_minutes?: number;
    notes?: string;
    status: "scheduled" | "overdue" | "completed";
    equipment?: Partial<Equipment>;
    assigned_user?: { id: string; full_name: string; email: string };
    created_at?: string;
    updated_at?: string;
}

export interface MaintenanceListParams extends PaginationParams {
    equipment_id?: string;
    status?: string;
    frequency?: string;
    assigned_to?: string;
    upcoming_days?: number;
    overdue?: boolean;
}

export const maintenanceApi = {
    list: (params: MaintenanceListParams = {}) =>
        fetchApi < MaintenanceSchedule[] > (`/api/maintenance/schedules${buildQuery(params)}`),

    get: (id: string) =>
        fetchApi < MaintenanceSchedule & { recent_logs: unknown[] } > (`/api/maintenance/schedules/${id}`),

    create: (data: Partial<MaintenanceSchedule>) =>
        fetchApi < MaintenanceSchedule > ("/api/maintenance/schedules", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<MaintenanceSchedule>) =>
        fetchApi < MaintenanceSchedule > (`/api/maintenance/schedules/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        fetchApi < void> (`/api/maintenance/schedules/${id}`, {
            method: "DELETE",
        }),

    complete: (id: string, data: { notes?: string; duration_minutes?: number; parts_used?: string; cost?: number }) =>
        fetchApi < { schedule: MaintenanceSchedule; log: unknown; next_due_date: string } > (
            `/api/maintenance/schedules/${id}/complete`,
            {
                method: "POST",
                body: JSON.stringify(data),
            }
        ),

    upcoming: () =>
        fetchApi < MaintenanceSchedule[] > ("/api/maintenance/schedules?upcoming_days=7"),

    overdue: () =>
        fetchApi < MaintenanceSchedule[] > ("/api/maintenance/schedules?overdue=true"),
};

// =====================
// Notifications API
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

    get: (id: string) =>
        fetchApi < Notification > (`/api/notifications/${id}`),

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
// Users API
// =====================
export interface User {
    id: string;
    email: string;
    full_name?: string;
    role: "admin" | "supervisor" | "technician";
    avatar_url?: string;
    is_active: boolean;
    tenant_id?: string;
    created_at?: string;
    updated_at?: string;
}

// Interfaccia per la risposta di create-user.ts
export interface CreateUserResponse {
    user: {
        id: string;
        email: string;
        profile: User;
    };
}

export const userApi = {
    list: () => fetchApi < User[] > ("/api/users/list"),

    // ✅ CORRETTO: endpoint cambiato da "/api/users/create" a "/api/create-user"
    create: (data: { email: string; password: string; full_name?: string; role: User["role"] }) =>
        fetchApi < CreateUserResponse > ("/api/create-user", {
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

// Legacy export for backwards compatibility
export const apiClient = {
    users: userApi,
    profile: {
        me: userApi.me,
    },
    equipment: {
        list: () => equipmentApi.list(),
    },
    maintenance: {
        upcoming: () => maintenanceApi.upcoming(),
    },
};