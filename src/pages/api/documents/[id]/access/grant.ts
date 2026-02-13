// ============================================================================
// API: POST /api/documents/[id]/access/grant
// ============================================================================
// File: pages/api/documents/[id]/access/grant.ts
// Concedi permessi (grant access) a role o user specifico
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
    // Solo POST method
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed',
            allowedMethods: ['POST']
        });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Document ID is required' });
    }

    try {
        // Auth check
        const { user, error: authError, supabase } = await verifyAuth(req);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const docService = getDocumentService();

        // Check manage permission (solo managers possono concedere permessi)
        const hasPermission = await docService.checkUserPermission(
            user.id,
            id,
            'manage'
        );

        if (!hasPermission) {
            return res.status(403).json({
                error: 'Access denied - Manage permission required to grant access'
            });
        }

        // Parse body
        const body = req.body;
        const {
            grantedToRole,
            grantedToUserId,
            permissionLevel,
            grantReason,
            expiresInDays,
        } = body;

        // Validation
        if (!grantedToRole && !grantedToUserId) {
            return res.status(400).json({
                error: 'Either grantedToRole or grantedToUserId is required'
            });
        }

        if (grantedToRole && grantedToUserId) {
            return res.status(400).json({
                error: 'Cannot grant to both role and user. Choose one.'
            });
        }

        if (!permissionLevel) {
            return res.status(400).json({
                error: 'permissionLevel is required (view, download, sign, manage)'
            });
        }

        if (!['view', 'download', 'sign', 'manage'].includes(permissionLevel)) {
            return res.status(400).json({
                error: 'Invalid permissionLevel. Must be: view, download, sign, or manage'
            });
        }

        if (!grantReason || grantReason.trim().length === 0) {
            return res.status(400).json({
                error: 'grantReason is required'
            });
        }

        // Validate role if provided
        if (grantedToRole) {
            const validRoles = ['admin', 'supervisor', 'technician'];
            if (!validRoles.includes(grantedToRole)) {
                return res.status(400).json({
                    error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
                });
            }
        }

        // Validate user exists if provided
        if (grantedToUserId) {
            const { data: targetUser, error: userError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', grantedToUserId)
                .single();

            if (userError || !targetUser) {
                return res.status(400).json({
                    error: 'User not found with provided grantedToUserId'
                });
            }
        }

        // Calculate expiration
        const expiresAt = expiresInDays && expiresInDays > 0
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
            : null;

        // Validate expiration (max 365 days)
        if (expiresInDays && (expiresInDays < 1 || expiresInDays > 365)) {
            return res.status(400).json({
                error: 'expiresInDays must be between 1 and 365'
            });
        }

        // Call database function to grant access
        const { data: grantId, error: grantError } = await supabase
            .rpc('grant_document_access', {
                p_document_id: id,
                p_permission_level: permissionLevel,
                p_granted_by: user.id,
                p_granted_to_role: grantedToRole || null,
                p_granted_to_user_id: grantedToUserId || null,
                p_expires_at: expiresAt,
                p_grant_reason: grantReason.trim(),
            });

        if (grantError) {
            throw grantError;
        }

        return res.status(201).json({
            success: true,
            message: 'Access granted successfully',
            grantId,
            grant: {
                documentId: id,
                grantedToRole: grantedToRole || null,
                grantedToUserId: grantedToUserId || null,
                permissionLevel,
                grantedBy: user.id,
                expiresAt: expiresAt,
                grantReason: grantReason.trim(),
            },
        });

    } catch (error) {
        console.error('Grant Access API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Failed to grant access',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}