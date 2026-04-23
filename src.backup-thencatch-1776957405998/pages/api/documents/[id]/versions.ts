import type { NextApiResponse } from "next";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const id = typeof req.query.id === "string" ? req.query.id : "";
    if (!id) return res.status(400).json({ error: "Document ID is required" });
    const supabase = getServiceSupabase();

    try {
        if (req.method === "GET") {
            const { data, error } = await supabase
                .from("document_versions")
                .select("id, document_id, version_number, file_path, file_name, file_size, mime_type, checksum_sha256, change_summary, created_at, created_by")
                .eq("document_id", id)
                .order("version_number", { ascending: false });
            if (error) throw error;

            const versions = (data ?? []).map((row: any) => ({
                id: row.id,
                document_id: row.document_id,
                version_number: row.version_number,
                storage_path: row.file_path,
                original_filename: row.file_name,
                file_size_bytes: row.file_size,
                mime_type: row.mime_type,
                checksum_sha256: row.checksum_sha256,
                change_description: row.change_summary ?? null,
                uploaded_at: row.created_at,
                uploaded_by: row.created_by ?? null,
            }));

            return res.status(200).json({ success: true, data: versions });
        }

        if (req.method === "POST") {
            return res.status(501).json({ error: "Version upload restore still pending" });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error: any) {
        console.error("Document versions restore error:", error);
        return res.status(500).json({ error: error?.message || "Versions failed" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
