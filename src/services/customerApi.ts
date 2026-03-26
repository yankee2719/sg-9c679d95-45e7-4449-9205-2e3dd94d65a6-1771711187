import { apiFetch } from "@/services/apiClient";

export interface CustomerPayload {
  name?: string | null;
  slug?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  province?: string | null;
  postal_code?: string | null;
  vat_number?: string | null;
  fiscal_code?: string | null;
  website?: string | null;
  subscription_status?: string | null;
}

export async function listCustomers() {
  return apiFetch<any[]>("/api/customers");
}

export async function getCustomer(id: string) {
  return apiFetch<any>(`/api/customers/${id}`);
}

export async function createCustomer(payload: CustomerPayload) {
  return apiFetch<any>("/api/customers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCustomer(id: string, payload: CustomerPayload) {
  return apiFetch<any>(`/api/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

