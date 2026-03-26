import type { NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest } from "@/lib/apiAuth";
import { resolveDocumentAccess, buildStoragePath, resolveMimeType, sha256Buffer } from "@/lib/server/documentWorkflow";

export const config = {
    api: { bodyParser: false },
};

const parseForm = (req: AuthenticatedRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> =>
    new Promise((resolve, reject) => {
        const form = formidable({ multiples: false });
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
        });
    });

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const documentId = typeof req.query.id === "string" ? req.query.id : "";
    if (!documentId) {
        return res.status(400).json({ error: "Document ID is required" });
    }

    try {
        const access = await resolveDocumentAccess(req, documentId);
        if (!access.document) return res.status(404).json({ error: "Document not found" });
        if (!access.canView) return res.status(403).json({ error: "Access denied" });

        if (req.method === "GET") {
            const { data: versions, error } = await access.serviceSupabase
                .from("document_versions")
                .select("id, document_id, version_number, file_path, file_name, file_size, mime_type, checksum_sha256, change_summary, created_at, created_by")
                .eq("document_id", documentId)
                .order("version_number", { ascending: false });
            if (error) return res.status(500).json({ error: error.message });

            const payload = (versions ?? []).map((row: any) => ({
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

            return res.status(200).json({ success: true, versions: payload });
        }

        if (req.method === "POST") {
            if (!access.canManage) return res.status(403).json({ error: "Manage permission required" });

            const { fields, files } = await parseForm(req);
            const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
            if (!uploadedFile) {
                return res.status(400).json({ error: "File is required" });
            }

            const changeReason = Array.isArray(fields.changeReason) ? fields.changeReason[0] : fields.changeReason;
            const changeSummary = Array.isArray(fields.changeSummary) ? fields.changeSummary[0] : fields.changeSummary;
            const newTitle = Array.isArray(fields.newTitle) ? fields.newTitle[0] : fields.newTitle;
            const newDescription = Array.isArray(fields.newDescription) ? fields.newDescription[0] : fields.newDescription;

            const buffer = fs.readFileSync(uploadedFile.filepath);
            const nextVersion = (access.document.version_count ?? 0) + 1;
            const fileName = uploadedFile.originalFilename || `document_v${nextVersion}.bin`;
            const mimeType = resolveMimeType(fileName, uploadedFile.mimetype);
            const storagePath = buildStoragePath(access.document.organization_id, documentId, nextVersion, fileName);
            const checksum = sha256Buffer(buffer);

            const { error: uploadError } = await access.serviceSupabase.storage.from("documents").upload(storagePath, buffer, { upsert: false, contentType: mimeType });
            if (uploadError) {
                return res.status(500).json({ error: uploadError.message });
            }

            const { data: version, error: versionError } = await access.serviceSupabase
                .from("document_versions")
                .insert({
                    document_id: documentId,
                    version_number: nextVersion,
                    previous_version_id: access.document.current_version_id,
                    file_path: storagePath,
                    file_name: fileName,
                    file_size: buffer.byteLength,
                    mime_type: mimeType,
                    checksum_sha256: checksum,
                    change_summary: (typeof changeSummary === "string" && changeSummary.trim()) || (typeof changeReason === "string" && changeReason.trim()) || "New version",
                    signature_data: null,
                    created_by: req.user.userId,
                } as any)
                .select("id, version_number, created_at")
                .single();

            if (versionError) {
                return res.status(500).json({ error: versionError.message });
            }

            const patch: Record<string, unknown> = {
                current_version_id: version.id,
                version_count: nextVersion,
                storage_bucket: "documents",
                storage_path: storagePath,
                mime_type: mimeType,
                file_size: buffer.byteLength,
                updated_at: new Date().toISOString(),
            };
            if (typeof newTitle === "string" && newTitle.trim()) patch.title = newTitle.trim();
            if (typeof newDescription === "string") patch.description = newDescription.trim() || null;

            const { error: docUpdateError } = await access.serviceSupabase.from("documents").update(patch as any).eq("id", documentId);
            if (docUpdateError) {
                return res.status(500).json({ error: docUpdateError.message });
            }

            await access.serviceSupabase.from("audit_logs").insert({
                organization_id: req.user.organizationId,
                actor_user_id: req.user.userId,
                entity_type: "document",
                entity_id: documentId,
                action: "version_created",
                machine_id: access.document.machine_id,
                metadata: { version_number: nextVersion, file_name: fileName, change_reason: changeReason || null },
            } as any).then(() => undefined).catch(() => undefined);

            fs.unlinkSync(uploadedFile.filepath);
            return res.status(201).json({ success: true, version });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        console.error("Document versions API error:", error);
        return res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
