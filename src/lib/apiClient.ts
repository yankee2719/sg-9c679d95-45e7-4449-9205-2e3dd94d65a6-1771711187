import { authService } from "@/services/authService";

/**
 * API Client for custom Next.js API endpoints (bypasses PostgREST)
 */

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    // Get current session token
    const session = await authService.getCurrentSession();
    if (!session) {
      return { error: "Not authenticated" };
    }

    // Make API request with JWT token
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `API error: ${response.status}` };
    }

    return { data };
  } catch (error) {
    console.error("API request failed:", error);
    return { error: "Network error" };
  }
}

export const apiClient = {
  // User management
  users: {
    list: () => fetchApi<{ users: any[] }>("/api/users/list"),
    
    create: (userData: {
      email: string;
      password: string;
      full_name?: string;
      role: "admin" | "supervisor" | "technician";
      phone?: string;
    }) =>
      fetchApi<{ message: string; user: any }>("/api/users/create", {
        method: "POST",
        body: JSON.stringify(userData),
      }),
    
    update: (id: string, updates: {
      full_name?: string;
      role?: "admin" | "supervisor" | "technician";
      phone?: string;
      is_active?: boolean;
    }) =>
      fetchApi<{ message: string }>(`/api/users/${id}/update`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
    
    delete: (id: string) =>
      fetchApi<{ message: string }>(`/api/users/${id}/delete`, {
        method: "DELETE",
      }),
  },

  // Profile
  profile: {
    me: () => fetchApi<{ profile: any }>("/api/profiles/me"),
  },

  // Equipment
  equipment: {
    list: () => fetchApi<{ equipment: any[] }>("/api/equipment/list"),
  },

  // Maintenance
  maintenance: {
    upcoming: () => fetchApi<{ schedules: any[] }>("/api/maintenance/upcoming"),
  },
};