import type { NextApiResponse } from "next";
import fs from "fs";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest } from "@/lib/apiAuth";
import { resolveDocumentAccess, buildStoragePath, resolveMimeType, sha256Buffer } from "@/lib/server/documentWorkflow";

export const config = {
    api: { bodyParser: false },
};

type ParsedForm = {
    fields: Record<string, string | string[] | undefined>;
    files: Record<string, any>;
};

async function parseForm(req: AuthenticatedRequest): Promise<ParsedForm> {
    let formidableLib: any;
    try {
        formidableLib = require("formidable");
    } catch {
        throw new Error('Missing dependency "formidable". Install it only if you need document upload/version upload endpoints.');
    }

    return new Promise((resolve, reject) => {
        const form = formidableLib.default ? formidableLib.default({ multiples: false }) : formidableLib({ multiples: false });
        form.parse(req, (err: Error | null, fields: Record<string, any>, files: Record<string, any>) => {
            if (err) reject(err);
            else resolve({ fields, files });
        });
    });
}

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
                change_description: row.change_summary,
                uploaded_at: row.created_at,
                uploaded_by: row.created_by,
            }));

            return res.status(200).json({ success: true, data: payload });
        }

        if (req.method === "POST") {
            if (!access.canManage) return res.status(403).json({ error: "Access denied" });

            const { fields, files } = await parseForm(req);
            const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
            if (!uploadedFile) {
                return res.status(400).json({ error: "File is required" });
            }

            const fileName = uploadedFile.originalFilename || uploadedFile.newFilename || "document.bin";
            const mimeType = resolveMimeType(fileName, uploadedFile.mimetype);
            const changeSummary = Array.isArray(fields.changeSummary) ? fields.changeSummary[0] : fields.changeSummary;
            const nextVersion = Number(access.document.version_count || 0) + 1;
            const storagePath = buildStoragePath(access.document.organization_id, documentId, nextVersion, fileName);
            const fileBuffer = fs.readFileSync(uploadedFile.filepath);
            const checksum = sha256Buffer(fileBuffer);
            const bucket = access.document.storage_bucket || "documents";

            const { error: uploadError } = await access.serviceSupabase.storage
                .from(bucket)
                .upload(storagePath, fileBuffer, {
                    upsert: false,
                    contentType: mimeType,
                });
            if (uploadError) return res.status(500).json({ error: uploadError.message });

            const { data: version, error: versionError } = await access.serviceSupabase
                .from("document_versions")
                .insert({
                    document_id: documentId,
                    version_number: nextVersion,
                    previous_version_id: access.document.current_version_id,
                    file_path: storagePath,
                    file_name: fileName,
                    file_size: fileBuffer.byteLength,
                    mime_type: mimeType,
                    checksum_sha256: checksum,
                    change_summary: changeSummary || null,
                    created_by: req.user.userId,
                })
                .select("id, document_id, version_number")
                .single();
            if (versionError) return res.status(500).json({ error: versionError.message });

            const now = new Date().toISOString();
            const { error: docUpdateError } = await access.serviceSupabase
                .from("documents")
                .update({
                    current_version_id: version.id,
                    version_count: nextVersion,
                    storage_bucket: bucket,
                    storage_path: storagePath,
                    mime_type: mimeType,
                    file_size: fileBuffer.byteLength,
                    updated_at: now,
                })
                .eq("id", documentId);
            if (docUpdateError) return res.status(500).json({ error: docUpdateError.message });

            await access.serviceSupabase.from("audit_logs").insert({
                organization_id: access.document.organization_id,
                entity_type: "document",
                entity_id: documentId,
                action: "version_created",
                performed_by: req.user.userId,
                details: {
                    version_number: nextVersion,
                    file_name: fileName,
                    change_summary: changeSummary || null,
                },
                success: true,
            });

            try {
                fs.unlinkSync(uploadedFile.filepath);
            } catch { }

            return res.status(201).json({ success: true, data: version });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        console.error("Document versions API error:", error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Unexpected error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
