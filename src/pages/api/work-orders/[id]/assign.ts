// ============================================================================
// API: POST /api/work-orders/[id]/assign
// ============================================================================
// File: pages/api/work-orders/[id]/assign.ts
// Assegna work order a tecnico
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getMaintenanceService } from '@/services/maintenanceService';
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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Work order ID is required' });
    }

    const { user, error: authError } = await verifyAuth(req);

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { technician_id } = req.body;

        if (!technician_id) {
            return res.status(400).json({ error: 'technician_id is required' });
        }

        const maintenanceService = getMaintenanceService();

        // Assign work order
        const workOrder = await maintenanceService.assignWorkOrder(
            id,
            technician_id,
            user.id
        );

        return res.status(200).json({
            success: true,
            message: 'Work order assigned successfully',
            workOrder,
        });

    } catch (error) {
        console.error('Assign API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Assignment failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}