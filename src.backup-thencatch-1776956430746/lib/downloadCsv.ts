import { supabase } from "@/integrations/supabase/client";

/**
 * Scarica un file CSV da un'API protetta con token Bearer.
 * Usalo al posto di <a href="/api/export/..."> che non passa l'auth.
 */
export async function downloadCsv(url: string, filename: string) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
        let message = "Export failed";
        try {
            const err = await response.json();
            message = err?.error || message;
        } catch {
            // ignore
        }
        throw new Error(message);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
}
