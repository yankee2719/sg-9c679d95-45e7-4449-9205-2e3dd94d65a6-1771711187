// ============================================================================
// API: GET /api/documents/[id]
// ============================================================================
// File: pages/api/documents/[id].ts
// Get, Update, Delete documento
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
        // ========================================================================
        // GET: Retrieve document
        // ========================================================================
        if (req.method === 'GET') {
            // Check permission
            const hasPermission = await docService.checkUserPermission(
                user.id,
                id,
                'view'
            );

            if (!hasPermission) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Get document
            const document = await docService.getDocumentById(id);

            if (!document) {
                return res.status(404).json({ error: 'Document not found' });
            }

            // Log view action
            await docService.logDocumentAction(
                id,
                'viewed',
                user.id,
                'Viewed via API'
            );

            return res.status(200).json({
                success: true,
                document
            });
        }

        // ========================================================================
        // PATCH: Update metadata
        // ========================================================================
        else if (req.method === 'PATCH') {
            // Check manage permission
            const hasPermission = await docService.checkUserPermission(
                user.id,
                id,
                'manage'
            );

            if (!hasPermission) {
                return res.status(403).json({ error: 'Access denied - Manage permission required' });
            }

            const body = req.body;

            // Update metadata
            const updatedDocument = await docService.updateDocumentMetadata(
                {
                    documentId: id,
                    title: body.title,
                    description: body.description,
                    complianceTags: body.complianceTags,
                    tags: body.tags,
                    metadata: body.metadata,
                },
                user.id
            );

            return res.status(200).json({
                success: true,
                message: 'Document updated successfully',
                document: updatedDocument
            });
        }

        // ========================================================================
        // DELETE: Delete document (admin only)
        // ========================================================================
        else if (req.method === 'DELETE') {
            // Check if user is admin
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'admin') {
                return res.status(403).json({
                    error: 'Access denied - Admin only'
                });
            }

            // Delete document
            await docService.deleteDocument(id);

            return res.status(200).json({
                success: true,
                message: 'Document deleted successfully'
            });
        }

        // ========================================================================
        // Method not allowed
        // ========================================================================
        else {
            return res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error) {
        console.error('Document API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Operation failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}