import type { NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest } from "@/lib/apiAuth";
import { canAttachToMachine, buildStoragePath, resolveMimeType, sha256Buffer } from "@/lib/server/documentWorkflow";

export const config = { api: { bodyParser: false } };

const parseForm = (req: AuthenticatedRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> =>
    new Promise((resolve, reject) => {
        const form = formidable({ multiples: false });
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
        });
    });

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
            return res.status(403).json({ error: "Machine access denied" });
        }

        const buffer = fs.readFileSync(uploadedFile.filepath);
        const fileName = uploadedFile.originalFilename || `${String(title).trim() || "document"}.bin`;
        const mimeType = resolveMimeType(fileName, uploadedFile.mimetype);
        const documentId = globalThis.crypto.randomUUID();
        const storagePath = buildStoragePath(req.user.organizationId, documentId, 1, fileName);
        const checksum = sha256Buffer(buffer);

        const { error: uploadError } = await access.serviceSupabase.storage.from("documents").upload(storagePath, buffer, { upsert: false, contentType: mimeType });
        if (uploadError) return res.status(500).json({ error: uploadError.message });

        const now = new Date().toISOString();
        const { data: document, error: documentError } = await access.serviceSupabase
            .from("documents")
            .insert({
                id: documentId,
                organization_id: req.user.organizationId,
                machine_id: machineId || null,
                title: String(title).trim(),
                description: typeof description === "string" ? description.trim() || null : null,
                category: String(category),
                version_count: 0,
                current_version_id: null,
                tags: [],
                created_by: req.user.userId,
                is_archived: false,
                archived_at: null,
                external_url: null,
                storage_bucket: "documents",
                storage_path: storagePath,
                mime_type: mimeType,
                file_size: buffer.byteLength,
                created_at: now,
                updated_at: now,
            } as any)
            .select("id, title, created_at")
            .single();
        if (documentError) return res.status(500).json({ error: documentError.message });

        const { data: version, error: versionError } = await access.serviceSupabase
            .from("document_versions")
            .insert({
                document_id: documentId,
                version_number: 1,
                previous_version_id: null,
                file_path: storagePath,
                file_name: fileName,
                file_size: buffer.byteLength,
                mime_type: mimeType,
                checksum_sha256: checksum,
                change_summary: "Initial upload",
                signature_data: null,
                created_by: req.user.userId,
            } as any)
            .select("id")
            .single();
        if (versionError) return res.status(500).json({ error: versionError.message });

        await access.serviceSupabase.from("documents").update({ current_version_id: version.id, version_count: 1, updated_at: now } as any).eq("id", documentId);
        await access.serviceSupabase.from("audit_logs").insert({ organization_id: req.user.organizationId, actor_user_id: req.user.userId, entity_type: "document", entity_id: documentId, action: "created", machine_id: machineId || null, metadata: { title: String(title).trim(), file_name: fileName } } as any).then(() => undefined).catch(() => undefined);

        fs.unlinkSync(uploadedFile.filepath);
        return res.status(201).json({ success: true, document: { ...document, current_version_id: version.id, version_count: 1 } });
    } catch (error) {
        console.error("Document upload API error:", error);
        return res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
