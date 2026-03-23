// ============================================================================
// API: POST /api/documents/upload
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
} from "@/lib/apiAuth";
import { getDocumentService } from "@/services/documentService";
import formidable from "formidable";
import fs from "fs";

// Disable body parser per file upload
export const config = {
    api: {
        bodyParser: false,
    },
};

const parseForm = (
    req: AuthenticatedRequest
): Promise<{
    fields: formidable.Fields;
    files: formidable.Files;
}> => {
    return new Promise((resolve, reject) => {
        const form = formidable({ multiples: false });
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
        });
    });
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // Parse form data
        const { fields, files } = await parseForm(req);

        const equipmentId = Array.isArray(fields.equipmentId)
            ? fields.equipmentId[0]
            : fields.equipmentId;
        const title = Array.isArray(fields.title)
            ? fields.title[0]
            : fields.title;
        const description = Array.isArray(fields.description)
            ? fields.description[0]
            : fields.description;
        const category = Array.isArray(fields.category)
            ? fields.category[0]
            : fields.category;
        const complianceTags = Array.isArray(fields.complianceTags)
            ? fields.complianceTags[0]
            : fields.complianceTags;
        const documentNumber = Array.isArray(fields.documentNumber)
            ? fields.documentNumber[0]
            : fields.documentNumber;
        const tags = Array.isArray(fields.tags)
            ? fields.tags[0]
            : fields.tags;

        const fileArray = Array.isArray(files.file)
            ? files.file
            : [files.file];
        const uploadedFile = fileArray[0];

        if (!uploadedFile) {
            return res.status(400).json({ error: "File is required" });
        }

        if (!equipmentId || !title || !category) {
            return res.status(400).json({
                error: "equipmentId, title, and category are required",
            });
        }

        const fileBuffer = fs.readFileSync(uploadedFile.filepath);

        const complianceTagsArray = complianceTags
            ? JSON.parse(complianceTags as string)
            : undefined;

        const tagsArray = tags
            ? (tags as string)
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined;

        const docService = getDocumentService();

        const document = await docService.createDocument(
            {
                equipmentId: equipmentId as string,
                title: title as string,
                description: (description as string) || undefined,
                category: category as any,
                file: fileBuffer,
                complianceTags: complianceTagsArray,
                documentNumber: (documentNumber as string) || undefined,
                tags: tagsArray,
            },
            req.user.userId
        );

        fs.unlinkSync(uploadedFile.filepath);

        return res.status(201).json({
            success: true,
            message: "Document uploaded successfully",
            document,
        });
    } catch (error) {
        console.error("Upload API Error:", error);
        return res.status(500).json({
            success: false,
            error: "Upload failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

