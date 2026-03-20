import { supabase } from "@/integrations/supabase/client";

export async function apiFetch(
    url: string,
    options?: RequestInit
) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options?.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "API error");
    }

    return res.json();
}