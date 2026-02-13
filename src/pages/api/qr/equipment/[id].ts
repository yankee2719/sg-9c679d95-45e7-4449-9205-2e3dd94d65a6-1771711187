// ============================================================================
// API: GET /api/qr/equipment/[id]       - List tokens per equipment
// API: DELETE /api/qr/equipment/[id]    - Revoke token
// ============================================================================
// File: pages/api/qr/equipment/[id].ts
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getQrTokenService } from '@/services/offlineAndQrService';
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
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Equipment ID is required' });
    }

    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const qrService = getQrTokenService();

    try {
        // -----------------------------------------------------------------------
        // GET: List all tokens for this equipment
        // -----------------------------------------------------------------------
        if (req.method === 'GET') {
            const tokens = await qrService.getEquipmentTokens(id);
            const history = await qrService.getScanHistory(id, 20);

            return res.status(200).json({
                success: true,
                tokens,
                recent_scans: history,
                active_count: tokens.filter(t => t.is_active).length,
                total_scans: tokens.reduce((sum, t) => sum + t.scan_count, 0),
            });
        }

        // -----------------------------------------------------------------------
        // DELETE: Revoke a specific token (token_id in body)
        // -----------------------------------------------------------------------
        else if (req.method === 'DELETE') {
            const { token_id, reason } = req.body;

            if (!token_id) {
                return res.status(400).json({ error: 'token_id is required in body' });
            }

            await qrService.revokeToken(token_id, user.id, reason);

            return res.status(200).json({
                success: true,
                message: 'QR token revoked successfully',
            });
        }

        else {
            return res.status(405).json({ error: 'Method not allowed', allowedMethods: ['GET', 'DELETE'] });
        }

    } catch (error) {
        console.error('QR Equipment API Error:', error);
        return res.status(500).json({ error: 'Operation failed' });
    }
}