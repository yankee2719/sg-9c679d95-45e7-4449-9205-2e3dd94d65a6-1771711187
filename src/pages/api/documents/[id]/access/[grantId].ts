// ============================================================================
// API: DELETE /api/documents/[id]/access/[grantId]
// ============================================================================
// File: pages/api/documents/[id]/access/[grantId].ts
// Revoca (elimina) un grant specifico
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
        return { user: null, error: 'No auth token', supabase };
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    return { user, error, supabase };
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Solo DELETE method
    if (req.method !== 'DELETE') {
        return res.status(405).json({
            error: 'Method not allowed',
            allowedMethods: ['DELETE']
        });
    }

    const { id, grantId } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Document ID is required' });
    }

    if (!grantId || typeof grantId !== 'string') {
        return res.status(400).json({ error: 'Grant ID is required' });
    }

    try {
        // Auth check
        const { user, error: authError, supabase } = await verifyAuth(req);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const docService = getDocumentService();

        // Check manage permission (solo managers possono revocare permessi)
        const hasPermission = await docService.checkUserPermission(
            user.id,
            id,
            'manage'
        );

        if (!hasPermission) {
            return res.status(403).json({
                error: 'Access denied - Manage permission required to revoke access'
            });
        }

        // Verify grant exists and belongs to this document
        const { data: existingGrant, error: grantError } = await supabase
            .from('document_access_grants')
            .select('id, document_id, granted_to_role, granted_to_user_id, permission_level, is_active')
            .eq('id', grantId)
            .single();

        if (grantError || !existingGrant) {
            return res.status(404).json({
                error: 'Grant not found'
            });
        }

        // Verify grant belongs to this document
        if (existingGrant.document_id !== id) {
            return res.status(400).json({
                error: 'Grant does not belong to this document'
            });
        }

        // Check if already revoked
        if (!existingGrant.is_active) {
            return res.status(400).json({
                error: 'Grant is already revoked'
            });
        }

        // Parse body for optional revoke reason
        const body = req.body || {};
        const revokeReason = body.revokeReason || 'Revoked by user';

        // Call database function to revoke
        const { data: revoked, error: revokeError } = await supabase
            .rpc('revoke_document_access', {
                p_grant_id: grantId,
                p_revoked_by: user.id,
                p_revoke_reason: revokeReason,
            });

        if (revokeError) {
            throw revokeError;
        }

        return res.status(200).json({
            success: true,
            message: 'Access revoked successfully',
            revoked: {
                grantId,
                documentId: id,
                grantedToRole: existingGrant.granted_to_role,
                grantedToUserId: existingGrant.granted_to_user_id,
                permissionLevel: existingGrant.permission_level,
                revokedBy: user.id,
                revokeReason,
                revokedAt: new Date().toISOString(),
            },
        });

    } catch (error) {
        console.error('Revoke Access API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Failed to revoke access',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}