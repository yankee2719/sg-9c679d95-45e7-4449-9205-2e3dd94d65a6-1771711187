import type { NextApiResponse } from "next";
import fs from "fs";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { ChecklistExecutionError, getExecutionDetail } from "@/lib/server/checklistExecutionService";

export const config = { api: { bodyParser: false } };

const BUCKET = "checklist-photos";
const MAX_SIZE = 8 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

type ParsedForm = {
    fields: Record<string, any>;
    files: Record<string, any>;
};

async function parseForm(req: AuthenticatedRequest): Promise<ParsedForm> {
    let formidableLib: any;
    try {
        formidableLib = require("formidable");
    } catch {
        throw new Error('Missing dependency "formidable".');
    }

    return new Promise((resolve, reject) => {
        const form = formidableLib.default ? formidableLib.default({ multiples: true }) : formidableLib({ multiples: true });
        form.parse(req, (err: Error | null, fields: Record<string, any>, files: Record<string, any>) => {
            if (err) reject(err);
            else resolve({ fields, files });
        });
    });
}

function toFileArray(fileInput: any): any[] {
    if (!fileInput) return [];
    return Array.isArray(fileInput) ? fileInput : [fileInput];
}

function readFirstFieldValue(value: any): string | null {
    if (Array.isArray(value)) {
        const first = value[0];
        return first == null ? null : String(first).trim() || null;
    }
    if (value == null) return null;
    const text = String(value).trim();
    return text || null;
}

export default withAuth(["admin", "supervisor", "technician"], async function handler(
    req: AuthenticatedRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const executionId = typeof req.query.id === "string" ? req.query.id : null;
    if (!executionId) {
        return res.status(400).json({ error: "Execution ID is required" });
    }

    const supabase = getServiceSupabase();

    try {
        await getExecutionDetail(supabase, req.user, executionId);

        const { fields, files } = await parseForm(req);
        const itemId = readFirstFieldValue(fields.itemId ?? fields.templateItemId);
        if (!itemId) {
            return res.status(400).json({ error: "Checklist item id is required" });
        }

        const uploadedFiles = toFileArray(files.files ?? files.file);
        if (uploadedFiles.length === 0) {
            return res.status(400).json({ error: "At least one file is required" });
        }

        const uploadedPaths: string[] = [];

        for (const uploadedFile of uploadedFiles) {
            if (!uploadedFile) continue;
            if (!ACCEPTED.has(uploadedFile.mimetype)) {
                return res.status(400).json({ error: "Unsupported file type" });
            }
            if ((uploadedFile.size ?? 0) > MAX_SIZE) {
                return res.status(400).json({ error: "File too large" });
            }

            const safeName = String(uploadedFile.originalFilename || uploadedFile.newFilename || "image.jpg")
                .replace(/[^a-zA-Z0-9._-]/g, "_");
            const path = `executions/${executionId}/${itemId}/${Date.now()}_${safeName}`;
            const fileBuffer = fs.readFileSync(uploadedFile.filepath);

            const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, fileBuffer, {
                cacheControl: "3600",
                upsert: false,
                contentType: uploadedFile.mimetype,
            });

            try {
                fs.unlinkSync(uploadedFile.filepath);
            } catch { }

            if (uploadError) {
                return res.status(500).json({ error: uploadError.message });
            }

            uploadedPaths.push(path);
        }

        return res.status(200).json({ success: true, data: { paths: uploadedPaths } });
    } catch (error: any) {
        console.error("Checklist photo upload API error:", error);
        if (error instanceof ChecklistExecutionError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        return res.status(500).json({ error: error?.message || "Checklist photo upload failed" });
    }
});
