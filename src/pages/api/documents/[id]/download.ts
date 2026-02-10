// ============================================================================
// API: GET/POST /api/documents/[id]/download
// ============================================================================
// File: pages/api/documents/[id]/download.ts
// GET: Download diretto del file
// POST: Ottieni signed URL temporaneo
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getDocumentService } from '@/services/documentService';
import { createClient } from '@supabase/supabase-js';

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
        // Check download permission
        const hasPermission = await docService.checkUserPermission(
            user.id,
            id,
            'download'
        );

        if (!hasPermission) {
            return res.status(403).json({
                error: 'Access denied - Download permission required'
            });
        }

        // ========================================================================
        // GET: Download diretto
        // ========================================================================
        if (req.method === 'GET') {
            // Download document (includes automatic audit log)
            const { blob, filename, mimeType } = await docService.downloadDocument(
                id,
                user.id
            );

            // Convert blob to buffer
            const buffer = Buffer.from(await blob.arrayBuffer());

            // Set headers per download
            res.setHeader('Content-Type', mimeType);
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${encodeURIComponent(filename)}"`
            );
            res.setHeader('Content-Length', buffer.length.toString());

            // Send file
            return res.status(200).send(buffer);
        }

        // ========================================================================
        // POST: Get signed URL (per download client-side)
        // ========================================================================
        else if (req.method === 'POST') {
            const body = req.body;
            const expiresIn = body.expiresIn || 3600; // Default 1 hour

            // Get signed URL
            const signedUrl = await docService.getSignedUrl(id, expiresIn);

            // Log download intent
            await docService.logDocumentAction(
                id,
                'downloaded',
                user.id,
                'Generated signed URL for download',
                { expiresIn }
            );

            return res.status(200).json({
                success: true,
                signedUrl,
                expiresIn,
                expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
            });
        }

        // ========================================================================
        // Method not allowed
        // ========================================================================
        else {
            return res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error) {
        console.error('Download API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Download failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}