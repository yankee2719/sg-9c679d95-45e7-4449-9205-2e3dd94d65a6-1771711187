import { supabase } from "@/integrations/supabase/client";

export async function apiFetch<T = any>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
        let message = "API error";
        try {
            if (contentType.includes("application/json")) {
                const err = await response.json();
                message = err?.error || err?.message || message;
            } else {
                message = await response.text();
            }
        } catch {
            // ignore parse failure
        }
        throw new Error(message);
    }

    if (contentType.includes("application/json")) {
        return response.json();
    }

    return (await response.text()) as unknown as T;
}