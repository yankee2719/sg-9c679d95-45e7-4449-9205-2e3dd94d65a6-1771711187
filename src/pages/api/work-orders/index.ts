// ============================================================================
// API: POST /api/work-orders
// ============================================================================
// File: pages/api/work-orders/index.ts
// Crea nuovo work order
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getMaintenanceService } from '@/services/maintenanceService';
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
    // Auth check
    const { user, error: authError } = await verifyAuth(req);

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const maintenanceService = getMaintenanceService();

    try {
        // ========================================================================
        // POST: Create work order
        // ========================================================================
        if (req.method === 'POST') {
            const body = req.body;

            // Validation
            if (!body.equipment_id || !body.plant_id || !body.title || !body.wo_type) {
                return res.status(400).json({
                    error: 'equipment_id, plant_id, title, and wo_type are required'
                });
            }

            // Get organization_id from user profile
            const { data: profile } = await (await verifyAuth(req)).supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) {
                return res.status(400).json({ error: 'User organization not found' });
            }

            // Create work order
            const workOrder = await maintenanceService.createWorkOrder(
                {
                    equipment_id: body.equipment_id,
                    plant_id: body.plant_id,
                    maintenance_plan_id: body.maintenance_plan_id,
                    title: body.title,
                    description: body.description,
                    priority: body.priority || 'medium',
                    wo_type: body.wo_type,
                    scheduled_start: body.scheduled_start,
                    scheduled_end: body.scheduled_end,
                    estimated_duration_minutes: body.estimated_duration_minutes,
                },
                user.id,
                profile.organization_id
            );

            return res.status(201).json({
                success: true,
                message: 'Work order created successfully',
                workOrder,
            });
        }

        // ========================================================================
        // GET: List work orders (with filters)
        // ========================================================================
        else if (req.method === 'GET') {
            const { equipment_id, status, my_orders } = req.query;

            let workOrders;

            if (my_orders === 'true') {
                // Get user's assigned work orders
                workOrders = await maintenanceService.getMyWorkOrders(user.id);
            } else if (equipment_id) {
                // Get work orders by equipment
                const statusFilter = status
                    ? (Array.isArray(status) ? status : [status]) as any[]
                    : undefined;

                workOrders = await maintenanceService.getWorkOrdersByEquipment(
                    equipment_id as string,
                    { status: statusFilter }
                );
            } else {
                return res.status(400).json({
                    error: 'Either equipment_id or my_orders=true is required'
                });
            }

            return res.status(200).json({
                success: true,
                workOrders,
                total: workOrders.length,
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
        console.error('Work Orders API Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Operation failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}