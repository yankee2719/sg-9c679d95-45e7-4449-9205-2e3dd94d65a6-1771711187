// ============================================================================
// API: GET /api/compliance/dashboard
// ============================================================================
// File: pages/api/compliance/dashboard.ts
// Compliance dashboard con filtri
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
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { user, error: authError, supabase } = await verifyAuth(req);

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Get user's organization
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            return res.status(400).json({ error: 'User organization not found' });
        }

        const complianceService = getComplianceService();

        // Parse filters
        const { plant_id, status, min_score, max_score } = req.query;

        const statusFilter = status
            ? (Array.isArray(status) ? status : [status]) as any[]
            : undefined;

        const minScore = min_score ? parseInt(min_score as string) : undefined;
        const maxScore = max_score ? parseInt(max_score as string) : undefined;

        // Get dashboard data
        const dashboard = await complianceService.getComplianceDashboard(
            profile.organization_id,
            {
                plantId: plant_id as string,
                status: statusFilter,
                minScore,
                maxScore,
            }
        );

        // Calculate summary stats
        const stats = {
            total: dashboard.length,
            compliant: dashboard.filter(d => d.overall_status === 'compliant').length,
            partial: dashboard.filter(d => d.overall_status === 'partial').length,
            non_compliant: dashboard.filter(d => d.overall_status === 'non_compliant').length,
            expired: dashboard.filter(d => d.overall_status === 'expired').length,
            averageScore: dashboard.length > 0
                ? Math.round(dashboard.reduce((sum, d) => sum + d.compliance_score, 0) / dashboard.length)
                : 0,
            criticalRisk: dashboard.filter(d => d.risk_level === 'critical').length,
            highRisk: dashboard.filter(d => d.risk_level === 'high').length,
        };

        return res.status(200).json({
            success: true,
            dashboard,
            stats,
        });

    } catch (error) {
        console.error('Compliance Dashboard API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Failed to load dashboard',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}