// ============================================================================
// API: GET/POST /api/documents/[id]/versions
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

// Disable body parser per file upload (POST)
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
    const { id } = req.query;

    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Document ID is required" });
    }

    const docService = getDocumentService();

    try {
        // ====================================================================
        // GET: Retrieve version history
        // ====================================================================
        if (req.method === "GET") {
            const hasPermission = await docService.checkUserPermission(
                req.user.userId,
                id,
                "view"
            );

            if (!hasPermission) {
                return res.status(403).json({
                    error: "Access denied - View permission required",
                });
            }

            const versions = await docService.getVersionHistory(id);

            return res.status(200).json({
                success: true,
                versions,
                totalVersions: versions.length,
            });
        }

        // ====================================================================
        // POST: Create new version
        // ====================================================================
        else if (req.method === "POST") {
            const hasPermission = await docService.checkUserPermission(
                req.user.userId,
                id,
                "manage"
            );

            if (!hasPermission) {
                return res.status(403).json({
                    error: "Access denied - Manage permission required to create versions",
                });
            }

            const { fields, files } = await parseForm(req);

            const changeReason = Array.isArray(fields.changeReason)
                ? fields.changeReason[0]
                : fields.changeReason;
            const changeSummary = Array.isArray(fields.changeSummary)
                ? fields.changeSummary[0]
                : fields.changeSummary;
            const newTitle = Array.isArray(fields.newTitle)
                ? fields.newTitle[0]
                : fields.newTitle;
            const newDescription = Array.isArray(fields.newDescription)
                ? fields.newDescription[0]
                : fields.newDescription;

            const fileArray = Array.isArray(files.file)
                ? files.file
                : [files.file];
            const uploadedFile = fileArray[0];

            if (!uploadedFile) {
                return res
                    .status(400)
                    .json({ error: "File is required for new version" });
            }

            if (!changeReason) {
                return res
                    .status(400)
                    .json({ error: "changeReason is required" });
            }

            const fileBuffer = fs.readFileSync(uploadedFile.filepath);

            const newVersion = await docService.createNewVersion(
                {
                    documentId: id,
                    file: fileBuffer,
                    changeReason: changeReason as string,
                    changeSummary: (changeSummary as string) || undefined,
                    newTitle: (newTitle as string) || undefined,
                    newDescription: (newDescription as string) || undefined,
                },
                req.user.userId
            );

            fs.unlinkSync(uploadedFile.filepath);

            return res.status(201).json({
                success: true,
                message: "New version created successfully",
                document: newVersion,
                versionNumber: newVersion.version_number,
            });
        }

        // ====================================================================
        else {
            return res.status(405).json({
                error: "Method not allowed",
                allowedMethods: ["GET", "POST"],
            });
        }
    } catch (error) {
        console.error("Versions API Error:", error);
        return res.status(500).json({
            success: false,
            error: "Operation failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

