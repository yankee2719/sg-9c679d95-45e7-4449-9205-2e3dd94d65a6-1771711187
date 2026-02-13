// ============================================================================
// API: GET/POST /api/compliance/inspector-access
// ============================================================================
// File: pages/api/compliance/inspector-access.ts
// Gestione accessi ispettori esterni
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getComplianceService } from '@/services/complianceService';
import { createClient } from '@supabase/supabase-js';

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
    const { user, error: authError, supabase } = await verifyAuth(req);

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const complianceService = getComplianceService();

    try {
        // ========================================================================
        // GET: List inspector access grants
        // ========================================================================
        if (req.method === 'GET') {
            // Get user's organization
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) {
                return res.status(400).json({ error: 'User organization not found' });
            }

            const grants = await complianceService.listInspectorAccess(profile.organization_id);

            return res.status(200).json({
                success: true,
                grants,
                total: grants.length,
                active: grants.filter(g => g.is_active).length,
                expired: grants.filter(g => !g.is_active).length,
            });
        }

        // ========================================================================
        // POST: Grant inspector access
        // ========================================================================
        else if (req.method === 'POST') {
            const body = req.body;

            // Validation
            if (!body.inspector_email || !body.expires_at) {
                return res.status(400).json({
                    error: 'inspector_email and expires_at are required'
                });
            }

            // Get user's organization
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) {
                return res.status(400).json({ error: 'User organization not found' });
            }

            // Grant access
            const grant = await complianceService.grantInspectorAccess({
                inspector_email: body.inspector_email,
                inspector_name: body.inspector_name,
                inspector_organization: body.inspector_organization,
                organization_id: profile.organization_id,
                plant_id: body.plant_id,
                equipment_ids: body.equipment_ids,
                access_type: body.access_type || 'read_only',
                expires_at: body.expires_at,
                granted_by: user.id,
                purpose: body.purpose,
                can_export: body.can_export,
                can_download_documents: body.can_download_documents,
            });

            return res.status(201).json({
                success: true,
                message: 'Inspector access granted',
                grant,
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
        console.error('Inspector Access API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Operation failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}