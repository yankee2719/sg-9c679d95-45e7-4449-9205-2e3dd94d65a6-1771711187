import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getQrTokenService } from '@/services/offlineAndQrService';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token } = req.body || {};
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'token is required' });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let userId: string | undefined;
    let userRole: string | undefined;

    try {
        const authToken = getAuthToken(req);

        if (authToken) {
            const { data: { user } } = await supabase.auth.getUser(authToken);

            if (user) {
                userId = user.id;

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle();

                userRole = profile?.role || undefined;
            }
        }

        const qrService = getQrTokenService();
        const result = await qrService.validateToken(token, userId, userRole);

        if (!result?.is_valid || !result.equipment_id) {
            return res.status(403).json({
                success: false,
                denial_reason: result?.denial_reason || 'access_denied',
            });
        }

        return res.status(200).json({
            success: true,
            equipment_id: result.equipment_id,
            allowed_views: result.allowed_views || [],
            max_permission_level: result.max_permission_level || null,
        });
    } catch (error) {
        console.error('QR Validate Error:', error);
        return res.status(500).json({ error: 'Failed to validate QR token' });
    }
}
