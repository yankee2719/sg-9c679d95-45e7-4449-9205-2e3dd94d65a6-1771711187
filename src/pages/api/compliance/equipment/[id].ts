// ============================================================================
// API: GET /api/compliance/equipment/[id]
// ============================================================================
// File: pages/api/compliance/equipment/[id].ts
// Get compliance status e report per equipment
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
        return res.status(400).json({ error: 'Equipment ID is required' });
    }

    const { user, error: authError } = await verifyAuth(req);

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const complianceService = getComplianceService();

    try {
        // ========================================================================
        // GET: Get compliance status or full report
        // ========================================================================
        if (req.method === 'GET') {
            const { full_report } = req.query;

            if (full_report === 'true') {
                // Get full compliance report
                const report = await complianceService.getComplianceReport(id);

                return res.status(200).json({
                    success: true,
                    report,
                });
            } else {
                // Get just status
                const status = await complianceService.getEquipmentComplianceStatus(id);

                if (!status) {
                    return res.status(404).json({ error: 'Compliance status not found' });
                }

                return res.status(200).json({
                    success: true,
                    status,
                });
            }
        }

        // ========================================================================
        // POST: Recalculate compliance
        // ========================================================================
        else if (req.method === 'POST') {
            await complianceService.recalculateCompliance(id);

            const status = await complianceService.getEquipmentComplianceStatus(id);

            return res.status(200).json({
                success: true,
                message: 'Compliance recalculated successfully',
                status,
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
        console.error('Equipment Compliance API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Operation failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}