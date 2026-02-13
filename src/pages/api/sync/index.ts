// ============================================================================
// API: POST /api/sync
// ============================================================================
// File: pages/api/sync/index.ts
// Riceve batch di operazioni offline e le applica in sequenza
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
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

interface SyncOperation {
    id: string;
    operation_type: 'create' | 'update' | 'delete';
    entity_type: string;
    entity_id: string;
    payload: any;
    client_timestamp: string;
    sequence_number?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { user, error: authError, supabase } = await verifyAuth(req);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { operations, plant_id, device_id } = req.body;

        if (!operations || !Array.isArray(operations) || operations.length === 0) {
            return res.status(400).json({ error: 'operations array is required' });
        }

        if (!plant_id) {
            return res.status(400).json({ error: 'plant_id is required' });
        }

        // Verify user belongs to this plant
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, plant_id')
            .eq('id', user.id)
            .single();

        if (profile?.plant_id && profile.plant_id !== plant_id) {
            return res.status(403).json({ error: 'Access denied for this plant' });
        }

        // Process operations in sequence order
        const sorted = [...operations].sort(
            (a, b) => (a.sequence_number || 0) - (b.sequence_number || 0)
        );

        const results: { id: string; status: 'synced' | 'failed' | 'conflict'; error?: string }[] = [];

        for (const op of sorted) {
            try {
                await applyOperation(supabase, op, user.id);
                results.push({ id: op.id, status: 'synced' });
            } catch (err: any) {
                const isConflict = err.message?.toLowerCase().includes('conflict');
                results.push({
                    id: op.id,
                    status: isConflict ? 'conflict' : 'failed',
                    error: err.message,
                });
            }
        }

        const synced = results.filter(r => r.status === 'synced').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const conflicts = results.filter(r => r.status === 'conflict').length;

        // Log sync session
        await supabase.from('sync_sessions').insert({
            organization_id: profile?.organization_id,
            plant_id,
            user_id: user.id,
            device_id: device_id || null,
            operations_synced: synced,
            operations_failed: failed + conflicts,
            conflicts_detected: conflicts,
            status: failed + conflicts === 0 ? 'completed' : 'completed',
            completed_at: new Date().toISOString(),
        });

        return res.status(200).json({
            success: true,
            results,
            summary: { synced, failed, conflicts, total: operations.length },
        });

    } catch (error) {
        console.error('Sync API Error:', error);
        return res.status(500).json({ error: 'Sync failed' });
    }
}

// -----------------------------------------------------------------------
// Apply single operation to DB
// -----------------------------------------------------------------------
async function applyOperation(
    supabase: any,
    op: SyncOperation,
    userId: string
): Promise<void> {
    switch (op.entity_type) {

        case 'work_order': {
            if (op.operation_type === 'update') {
                // Server truth: block if closed
                const { data: existing } = await supabase
                    .from('work_orders')
                    .select('is_closed, updated_at')
                    .eq('id', op.entity_id)
                    .single();

                if (existing?.is_closed) {
                    throw new Error('conflict: work order is closed on server');
                }

                const { error } = await supabase
                    .from('work_orders')
                    .update({ ...op.payload, updated_at: new Date().toISOString() })
                    .eq('id', op.entity_id);

                if (error) throw error;
            }
            break;
        }

        case 'checklist': {
            const { work_order_id, checklist, percentage } = op.payload;
            const { error } = await supabase
                .from('work_orders')
                .update({
                    checklist,
                    checklist_completion_percentage: percentage,
                })
                .eq('id', work_order_id);
            if (error) throw error;
            break;
        }

        case 'machine_event': {
            const { error } = await supabase
                .from('machine_events')
                .insert({
                    ...op.payload,
                    recorded_by: userId,
                    recorded_at: op.client_timestamp,
                });
            if (error) throw error;
            break;
        }

        default:
            throw new Error(`Unknown entity_type: ${op.entity_type}`);
    }
}