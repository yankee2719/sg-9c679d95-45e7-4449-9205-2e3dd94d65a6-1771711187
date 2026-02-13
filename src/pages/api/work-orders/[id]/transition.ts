// ============================================================================
// API: POST /api/work-orders/[id]/transition
// ============================================================================
// File: pages/api/work-orders/[id]/transition.ts
// Cambia stato del work order (state machine)
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getMaintenanceService, WorkOrderStatus } from '@/services/maintenanceService';
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
        return res.status(405).json({
            error: 'Method not allowed',
            allowedMethods: ['POST']
        });
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
        const body = req.body;
        const { new_status, reason, metadata } = body;

        // Validation
        if (!new_status) {
            return res.status(400).json({ error: 'new_status is required' });
        }

        const validStatuses: WorkOrderStatus[] = [
            'draft', 'scheduled', 'assigned', 'in_progress',
            'paused', 'completed', 'approved', 'cancelled'
        ];

        if (!validStatuses.includes(new_status)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const maintenanceService = getMaintenanceService();

        // Transition status
        const success = await maintenanceService.transitionWorkOrderStatus(
            id,
            new_status,
            user.id,
            reason,
            metadata
        );

        if (!success) {
            return res.status(400).json({
                error: 'Status transition failed. Check state machine rules.'
            });
        }

        // Get updated work order
        const workOrder = await maintenanceService.getWorkOrderById(id);

        return res.status(200).json({
            success: true,
            message: `Work order transitioned to ${new_status}`,
            workOrder,
        });

    } catch (error) {
        console.error('Transition API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Transition failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}