import type { NextApiResponse } from "next";
import fs from "fs";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest } from "@/lib/apiAuth";
import { canAttachToMachine, buildStoragePath, resolveMimeType, sha256Buffer } from "@/lib/server/documentWorkflow";

export const config = { api: { bodyParser: false } };

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
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    if (!req.user.organizationId) {
        return res.status(400).json({ error: "No active organization context" });
    }

    try {
        const { fields, files } = await parseForm(req);
        const machineId = (Array.isArray(fields.machineId) ? fields.machineId[0] : fields.machineId) || (Array.isArray(fields.equipmentId) ? fields.equipmentId[0] : fields.equipmentId) || null;
        const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
        const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
        const category = Array.isArray(fields.category) ? fields.category[0] : fields.category;
        const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;

        if (!uploadedFile || !title || !category) {
            return res.status(400).json({ error: "file, title and category are required" });
        }

        const access = await canAttachToMachine(req, machineId ? String(machineId) : null);
        if (!access.allowed && !req.user.isPlatformAdmin) {
            return res.status(403).json({ error: "Access denied for target machine" });
        }

        const fileName = uploadedFile.originalFilename || uploadedFile.newFilename || "document.bin";
        const mimeType = resolveMimeType(fileName, uploadedFile.mimetype);
        const fileBuffer = fs.readFileSync(uploadedFile.filepath);
        const checksum = sha256Buffer(fileBuffer);
        const bucket = "documents";

        const { data: insertedDocument, error: insertError } = await access.serviceSupabase
            .from("documents")
            .insert({
                organization_id: req.user.organizationId,
                machine_id: machineId ? String(machineId) : null,
                title: String(title),
                description: description ? String(description) : null,
                category: String(category),
                created_by: req.user.userId,
                storage_bucket: bucket,
                version_count: 0,
                current_version_id: null,
                is_archived: false,
            })
            .select("id, organization_id")
            .single();
        if (insertError || !insertedDocument) {
            return res.status(500).json({ error: insertError?.message || "Failed to create document" });
        }

        const storagePath = buildStoragePath(insertedDocument.organization_id, insertedDocument.id, 1, fileName);
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
                document_id: insertedDocument.id,
                version_number: 1,
                previous_version_id: null,
                file_path: storagePath,
                file_name: fileName,
                file_size: fileBuffer.byteLength,
                mime_type: mimeType,
                checksum_sha256: checksum,
                created_by: req.user.userId,
            })
            .select("id")
            .single();
        if (versionError || !version) {
            return res.status(500).json({ error: versionError?.message || "Failed to create document version" });
        }

        const now = new Date().toISOString();
        const { error: docUpdateError } = await access.serviceSupabase
            .from("documents")
            .update({
                current_version_id: version.id,
                version_count: 1,
                storage_bucket: bucket,
                storage_path: storagePath,
                mime_type: mimeType,
                file_size: fileBuffer.byteLength,
                updated_at: now,
            })
            .eq("id", insertedDocument.id);
        if (docUpdateError) {
            return res.status(500).json({ error: docUpdateError.message });
        }

        await access.serviceSupabase.from("audit_logs").insert({
            organization_id: req.user.organizationId,
            entity_type: "document",
            entity_id: insertedDocument.id,
            action: "created",
            performed_by: req.user.userId,
            details: {
                title: String(title),
                category: String(category),
                file_name: fileName,
            },
            success: true,
        });

        try {
            fs.unlinkSync(uploadedFile.filepath);
        } catch { }

        return res.status(201).json({
            success: true,
            data: { id: insertedDocument.id },
        });
    } catch (error) {
        console.error("Document upload API error:", error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Unexpected error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
