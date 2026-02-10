// ============================================================================
// API: GET/POST /api/documents/[id]/versions
// ============================================================================
// File: pages/api/documents/[id]/versions.ts
// GET: Ottieni storico versioni
// POST: Crea nuova versione del documento
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getDocumentService } from '@/services/documentService';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

// Disable body parser per file upload (POST)
export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper per estrarre token
function getAuthToken(req: NextApiRequest): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    const cookies = req.headers.cookie?.split(';') || [];
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'sb-access-token' || name.includes('auth-token')) {
            return value;
        }
    }

    return null;
}

// Helper per verificare auth
async function verifyAuth(req: NextApiRequest) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const token = getAuthToken(req);
    if (!token) {
        return { user: null, error: 'No auth token' };
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    return { user, error };
}

// Parse form con file
const parseForm = (req: NextApiRequest): Promise<{
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

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Document ID is required' });
    }

    // Auth check
    const { user, error: authError } = await verifyAuth(req);

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const docService = getDocumentService();

    try {
        // ========================================================================
        // GET: Retrieve version history
        // ========================================================================
        if (req.method === 'GET') {
            // Check view permission
            const hasPermission = await docService.checkUserPermission(
                user.id,
                id,
                'view'
            );

            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Access denied - View permission required'
                });
            }

            // Get version history
            const versions = await docService.getVersionHistory(id);

            return res.status(200).json({
                success: true,
                versions,
                totalVersions: versions.length,
            });
        }

        // ========================================================================
        // POST: Create new version
        // ========================================================================
        else if (req.method === 'POST') {
            // Check manage permission (solo managers possono creare versioni)
            const hasPermission = await docService.checkUserPermission(
                user.id,
                id,
                'manage'
            );

            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Access denied - Manage permission required to create versions'
                });
            }

            // Parse form data (con file)
            const { fields, files } = await parseForm(req);

            // Extract fields
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

            // Extract file
            const fileArray = Array.isArray(files.file) ? files.file : [files.file];
            const uploadedFile = fileArray[0];

            // Validation
            if (!uploadedFile) {
                return res.status(400).json({
                    error: 'File is required for new version'
                });
            }

            if (!changeReason) {
                return res.status(400).json({
                    error: 'changeReason is required'
                });
            }

            // Read file as buffer
            const fileBuffer = fs.readFileSync(uploadedFile.filepath);

            // Create new version
            const newVersion = await docService.createNewVersion(
                {
                    documentId: id,
                    file: fileBuffer,
                    changeReason: changeReason as string,
                    changeSummary: (changeSummary as string) || undefined,
                    newTitle: (newTitle as string) || undefined,
                    newDescription: (newDescription as string) || undefined,
                },
                user.id
            );

            // Cleanup temp file
            fs.unlinkSync(uploadedFile.filepath);

            return res.status(201).json({
                success: true,
                message: 'New version created successfully',
                document: newVersion,
                versionNumber: newVersion.version_number,
            });
        }

        // ========================================================================
        // Method not allowed
        // ========================================================================
        else {
            return res.status(405).json({
                error: 'Method not allowed',
                allowedMethods: ['GET', 'POST']
            });
        }

    } catch (error) {
        console.error('Versions API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Operation failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}