// src/services/machineEventsService.ts
// ============================================================================
// MACHINE EVENTS SERVICE — now backed by real machine_events table
// ============================================================================
// Changes from old version:
//   - RPC call now matches actual DB function: insert_machine_event
//   - Table machine_events now exists
//   - verify_machine_event_chain is a real DB function
//   - Removed client-side hash computation (done server-side in DB trigger)
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

export type EventActorType = 'user' | 'system' | 'api' | 'webhook';

export interface MachineEvent {
    id: string;
    machine_id: string;
    organization_id: string;
    event_type: string;
    event_version: number;
    payload: Record<string, any>;
    created_at: string;
    actor_id: string | null;
    actor_type: EventActorType;
    previous_hash: string | null;
    hash: string;
    sequence_number: number;
}

export interface EventVerification {
    event_id: string;
    event_type: string;
    sequence_number: number;
    created_at: string;
    is_valid: boolean;
    expected_previous_hash: string | null;
    actual_previous_hash: string | null;
}

// ============================================================================
// COMMON EVENT TYPES
// ============================================================================

export const EVENT_TYPES = {
    // Lifecycle
    LIFECYCLE_CHANGED: 'lifecycle.changed',
    COMMISSIONED: 'lifecycle.commissioned',
    DECOMMISSIONED: 'lifecycle.decommissioned',
    TRANSFERRED: 'lifecycle.transferred',

    // Maintenance
    MAINTENANCE_COMPLETED: 'maintenance.completed',
    MAINTENANCE_STARTED: 'maintenance.started',
    INSPECTION_COMPLETED: 'inspection.completed',

    // Documents
    DOCUMENT_UPLOADED: 'document.uploaded',
    DOCUMENT_VERSION_ADDED: 'document.version_added',
    DOCUMENT_SIGNED: 'document.signed',

    // Operations
    CHECKLIST_EXECUTED: 'checklist.executed',
    ANOMALY_REPORTED: 'anomaly.reported',
    NOTE_ADDED: 'note.added',
    PHOTO_ADDED: 'photo.added',
} as const;

// ============================================================================
// SERVICE
// ============================================================================

export const machineEventsService = {

    // ─── RECORD EVENT ────────────────────────────────────────────────────

    async recordEvent(params: {
        machineId: string;
        organizationId: string;
        eventType: string;
        payload: Record<string, any>;
        actorType?: EventActorType;
    }): Promise<string | null> {
        try {
            const { data, error } = await supabase.rpc('insert_machine_event', {
                p_machine_id: params.machineId,
                p_organization_id: params.organizationId,
                p_event_type: params.eventType,
                p_payload: params.payload,
                p_actor_type: params.actorType || 'user',
            });

            if (error) throw error;
            return data as string;
        } catch (error) {
            console.error('Failed to record machine event:', error);
            return null;
        }
    },

    // ─── TIMELINE ────────────────────────────────────────────────────────

    async getTimeline(
        machineId: string,
        options?: {
            limit?: number;
            eventTypes?: string[];
            after?: string;
            before?: string;
        }
    ): Promise<MachineEvent[]> {
        let query = supabase
            .from('machine_events')
            .select('*')
            .eq('machine_id', machineId)
            .order('sequence_number', { ascending: false })
            .limit(options?.limit || 50);

        if (options?.eventTypes?.length) {
            query = query.in('event_type', options.eventTypes);
        }
        if (options?.after) {
            query = query.gt('created_at', options.after);
        }
        if (options?.before) {
            query = query.lt('created_at', options.before);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching timeline:', error);
            return [];
        }
        return data || [];
    },

    // ─── ORGANIZATION EVENTS ─────────────────────────────────────────────

    async getOrganizationEvents(
        organizationId: string,
        options?: { limit?: number; eventTypes?: string[] }
    ): Promise<MachineEvent[]> {
        let query = supabase
            .from('machine_events')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(options?.limit || 100);

        if (options?.eventTypes?.length) {
            query = query.in('event_type', options.eventTypes);
        }

        const { data, error } = await query;
        if (error) return [];
        return data || [];
    },

    // ─── VERIFY CHAIN ────────────────────────────────────────────────────

    async verifyChain(machineId: string): Promise<{
        isValid: boolean;
        totalEvents: number;
        invalidEvents: EventVerification[];
    }> {
        try {
            const { data, error } = await supabase.rpc('verify_machine_event_chain', {
                p_machine_id: machineId,
            });

            if (error) throw error;

            const events = (data || []) as EventVerification[];
            const invalid = events.filter(e => !e.is_valid);

            return {
                isValid: invalid.length === 0,
                totalEvents: events.length,
                invalidEvents: invalid,
            };
        } catch (error) {
            console.error('Error verifying chain:', error);
            return { isValid: false, totalEvents: 0, invalidEvents: [] };
        }
    },

    // ─── EVENT STATS ─────────────────────────────────────────────────────

    async getEventCount(machineId: string): Promise<number> {
        const { count, error } = await supabase
            .from('machine_events')
            .select('*', { count: 'exact', head: true })
            .eq('machine_id', machineId);

        return error ? 0 : (count || 0);
    },

    async getLastEvent(machineId: string): Promise<MachineEvent | null> {
        const { data, error } = await supabase
            .from('machine_events')
            .select('*')
            .eq('machine_id', machineId)
            .order('sequence_number', { ascending: false })
            .limit(1)
            .single();

        if (error) return null;
        return data;
    },
};