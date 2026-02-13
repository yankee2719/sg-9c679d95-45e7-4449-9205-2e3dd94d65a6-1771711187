// ============================================================================
// API: GET/PATCH /api/work-orders/[id]
// ============================================================================
// File: pages/api/work-orders/[id]/index.ts
// Get, Update work order
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
        return { user: null, error: 'No auth token', supabase };
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    return { user, error, supabase };
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Work order ID is required' });
    }

    const { user, error: authError } = await verifyAuth(req);

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const maintenanceService = getMaintenanceService();

    try {
        // ========================================================================
        // GET: Get work order
        // ========================================================================
        if (req.method === 'GET') {
            const workOrder = await maintenanceService.getWorkOrderById(id);

            if (!workOrder) {
                return res.status(404).json({ error: 'Work order not found' });
            }

            return res.status(200).json({
                success: true,
                workOrder,
            });
        }

        // ========================================================================
        // PATCH: Update work order
        // ========================================================================
        else if (req.method === 'PATCH') {
            const body = req.body;

            // Check if work order exists
            const existing = await maintenanceService.getWorkOrderById(id);
            if (!existing) {
                return res.status(404).json({ error: 'Work order not found' });
            }

            // Check if closed
            if (existing.is_closed) {
                return res.status(400).json({ error: 'Cannot update closed work order' });
            }

            // Update
            const updated = await maintenanceService.updateWorkOrder(
                id,
                body,
                user.id
            );

            return res.status(200).json({
                success: true,
                message: 'Work order updated successfully',
                workOrder: updated,
            });
        }

        // ========================================================================
        // Method not allowed
        // ========================================================================
        else {
            return res.status(405).json({
                error: 'Method not allowed',
                allowedMethods: ['GET', 'PATCH']
            });
        }

    } catch (error) {
        console.error('Work Order API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Operation failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}