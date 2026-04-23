import { supabase } from "@/integrations/supabase/client";

/**
 * Scarica un file CSV.
 *
 * Due modalità:
 *  - `downloadCsv(url, filename)` — scarica da un'API protetta con Bearer token.
 *    Usalo al posto di <a href="/api/export/..."> che non passa l'auth.
 *  - `downloadCsv(rows, filename)` — genera CSV da un array di oggetti locali
 *    (usato per export client-side).
 */
export async function downloadCsv(urlOrRows: string, filename: string): Promise<void>;
export async function downloadCsv(urlOrRows: Record<string, unknown>[], filename: string): Promise<void>;
export async function downloadCsv(
    urlOrRows: string | Record<string, unknown>[],
    filename: string
): Promise<void> {
    let blob: Blob;

    if (typeof urlOrRows === "string") {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        const response = await fetch(urlOrRows, {
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

        blob = await response.blob();
    } else {
        // Build CSV from inline rows
        const rows = urlOrRows;
        if (!Array.isArray(rows) || rows.length === 0) {
            blob = new Blob([""], { type: "text/csv;charset=utf-8;" });
        } else {
            const headers = Object.keys(rows[0]);
            const escape = (value: unknown): string => {
                if (value === null || value === undefined) return "";
                const s = String(value);
                if (/[",\n\r]/.test(s)) {
                    return `"${s.replace(/"/g, '""')}"`;
                }
                return s;
            };
            const csvLines = [
                headers.join(","),
                ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
            ];
            blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
        }
    }

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
}
