// ============================================================================
// API: POST /api/documents/upload
// ============================================================================
// File: pages/api/documents/upload.ts
// Upload documento con NUOVO Supabase SSR (non deprecato)
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getDocumentService } from '@/services/documentService';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

// Disable body parser per file upload
export const config = {
    api: {
        bodyParser: false,
    },
};

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

// Helper per estrarre token da cookie o header
function getAuthToken(req: NextApiRequest): string | null {
    // Prova header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Prova cookie (formato Supabase standard)
    const cookies = req.headers.cookie?.split(';') || [];
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'sb-access-token' || name.includes('auth-token')) {
            return value;
        }
    }

    return null;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Solo POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. CREATE SUPABASE CLIENT (nuovo modo)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase environment variables not configured');
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // 2. GET AUTH TOKEN
        const token = getAuthToken(req);

        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized - No auth token found'
            });
        }

        // 3. VERIFY USER con token
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({
                error: 'Unauthorized - Invalid token',
                details: authError?.message
            });
        }

        const userId = user.id;

        // 4. PARSE FORM DATA
        const { fields, files } = await parseForm(req);

        // Extract fields (formidable ritorna array)
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

        // Extract file
        const fileArray = Array.isArray(files.file) ? files.file : [files.file];
        const uploadedFile = fileArray[0];

        // 5. VALIDATION
        if (!uploadedFile) {
            return res.status(400).json({ error: 'File is required' });
        }

        if (!equipmentId || !title || !category) {
            return res.status(400).json({
                error: 'equipmentId, title, and category are required'
            });
        }

        // 6. READ FILE as Buffer
        const fileBuffer = fs.readFileSync(uploadedFile.filepath);

        // 7. PARSE ARRAYS
        const complianceTagsArray = complianceTags
            ? JSON.parse(complianceTags as string)
            : undefined;

        const tagsArray = tags
            ? (tags as string).split(',').map(t => t.trim()).filter(Boolean)
            : undefined;

        // 8. UPLOAD DOCUMENT
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
            userId
        );

        // 9. CLEANUP temp file
        fs.unlinkSync(uploadedFile.filepath);

        // 10. SUCCESS
        return res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            document,
        });

    } catch (error) {
        console.error('Upload API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Upload failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}