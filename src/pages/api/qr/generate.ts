// ============================================================================
// API: POST /api/qr/generate
// ============================================================================
// File: pages/api/qr/generate.ts
// Genera nuovo QR token per equipment
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getQrTokenService, QrTokenType } from '@/services/offlineAndQrService';
import { createClient } from '@supabase/supabase-js';

function getAuthToken(req: NextApiRequest): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7);
    const cookies = req.headers.cookie?.split(';') || [];
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'sb-access-token' || name.includes('auth-token')) return value;
    }
    return null;
}

async function verifyAuth(req: NextApiRequest) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const token = getAuthToken(req);
    if (!token) return { user: null, error: 'No auth token', supabase };
    const { data: { user }, error } = await supabase.auth.getUser(token);
    return { user, error, supabase };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { user, error: authError, supabase } = await verifyAuth(req);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    // Only admins/supervisors can generate QR tokens
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!['admin', 'supervisor'].includes(profile?.role)) {
        return res.status(403).json({ error: 'Only admins and supervisors can generate QR tokens' });
    }

    try {
        const {
            equipment_id,
            token_type = 'permanent',
            expires_at,
            allowed_views,
            max_scans,
            allowed_roles,
            label,
        } = req.body;

        if (!equipment_id) {
            return res.status(400).json({ error: 'equipment_id is required' });
        }

        const validTypes: QrTokenType[] = ['permanent', 'temporary', 'inspector', 'maintenance'];
        if (!validTypes.includes(token_type)) {
            return res.status(400).json({ error: `token_type must be one of: ${validTypes.join(', ')}` });
        }

        const qrService = getQrTokenService();
        const result = await qrService.generateToken(
            equipment_id,
            token_type,
            user.id,
            { expiresAt: expires_at, allowedViews: allowed_views, maxScans: max_scans, allowedRoles: allowed_roles, label }
        );

        return res.status(201).json({
            success: true,
            message: 'QR token generated. Save the token_cleartext now - it will not be shown again.',
            token_id: result.tokenId,
            token_cleartext: result.tokenCleartext,
            qr_url: result.qrUrl,
        });

    } catch (error) {
        console.error('QR Generate Error:', error);
        return res.status(500).json({ error: 'Failed to generate QR token' });
    }
}