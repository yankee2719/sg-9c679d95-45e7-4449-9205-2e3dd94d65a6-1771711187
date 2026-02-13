// ============================================================================
// API: GET /api/documents/[id]/access
// ============================================================================
// File: pages/api/documents/[id]/access/index.ts
// Lista tutti i grant (permessi) attivi per il documento
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
    // Solo GET method
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Method not allowed',
            allowedMethods: ['GET']
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

        // Check view permission (almeno view per vedere i grant)
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

        // Get grants from database
        const { data: grants, error: grantsError } = await supabase
            .from('document_access_grants')
            .select(`
        id,
        document_id,
        granted_to_role,
        granted_to_user_id,
        permission_level,
        granted_by,
        granted_at,
        expires_at,
        is_active,
        grant_reason,
        created_at
      `)
            .eq('document_id', id)
            .eq('is_active', true)
            .order('granted_at', { ascending: false });

        if (grantsError) {
            throw grantsError;
        }

        // Enrich grants con user info (opzionale ma utile)
        const enrichedGrants = await Promise.all(
            (grants || []).map(async (grant) => {
                // Get granted_by user info
                const { data: grantedByUser } = await supabase
                    .from('profiles')
                    .select('full_name, email')
                    .eq('id', grant.granted_by)
                    .single();

                // Get granted_to user info (se granted_to_user_id esiste)
                let grantedToUser = null;
                if (grant.granted_to_user_id) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('full_name, email')
                        .eq('id', grant.granted_to_user_id)
                        .single();
                    grantedToUser = data;
                }

                // Check if expired
                const isExpired = grant.expires_at
                    ? new Date(grant.expires_at) < new Date()
                    : false;

                return {
                    ...grant,
                    granted_by_name: grantedByUser?.full_name || null,
                    granted_by_email: grantedByUser?.email || null,
                    granted_to_user_name: grantedToUser?.full_name || null,
                    granted_to_user_email: grantedToUser?.email || null,
                    is_expired: isExpired,
                };
            })
        );

        // Calculate stats
        const stats = {
            total: enrichedGrants.length,
            byPermissionLevel: {} as Record<string, number>,
            byGrantType: {
                role: 0,
                user: 0,
            },
            expired: 0,
            active: 0,
        };

        enrichedGrants.forEach(grant => {
            // Count by permission level
            stats.byPermissionLevel[grant.permission_level] =
                (stats.byPermissionLevel[grant.permission_level] || 0) + 1;

            // Count by grant type
            if (grant.granted_to_role) {
                stats.byGrantType.role++;
            } else {
                stats.byGrantType.user++;
            }

            // Count expired/active
            if (grant.is_expired) {
                stats.expired++;
            } else {
                stats.active++;
            }
        });

        return res.status(200).json({
            success: true,
            grants: enrichedGrants,
            stats,
        });

    } catch (error) {
        console.error('Access Grants List API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve access grants',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}