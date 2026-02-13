// src/services/machineEventsService.ts
import { supabase } from '@/integrations/supabase/client';

export interface MachineEvent {
    event_id: string;
    equipment_id: string;  // ✅ Cambiato da machine_id
    organization_id: string;
    event_type: string;
    event_version: number;
    payload: Record<string, any>;
    created_at: string;
    actor_id: string | null;
    actor_type: string | null;
    previous_hash: string | null;
    hash: string;
    sequence_number: number;
}

export interface EventVerification {
    event_id: string;
    event_type: string;
    created_at: string;
    is_valid: boolean;
    expected_previous_hash: string | null;
    actual_previous_hash: string | null;
}

/**
 * Service per gestire eventi immutabili delle macchine
 * Event sourcing con hash chain per audit trail tamper-proof
 */
export class MachineEventService {
    /**
     * Registra un nuovo evento per una macchina
     * @returns event_id dell'evento creato
     */
    static async recordEvent({
        equipmentId,  // ✅ Cambiato da machineId
        organizationId,
        eventType,
        payload,
        actorType = 'user',
    }: {
        equipmentId: string;  // ✅ Cambiato da machineId
        organizationId: string;
        eventType: string;
        payload: Record<string, any>;
        actorType?: 'user' | 'system' | 'api' | 'webhook';
    }): Promise<string> {
        // Using imported supabase client

        const { data, error } = await supabase.rpc('insert_machine_event', {
            p_equipment_id: equipmentId,  // ✅ Cambiato da p_machine_id
            p_organization_id: organizationId,
            p_event_type: eventType,
            p_payload: payload,
            p_actor_type: actorType,
        });

        if (error) {
            console.error('Failed to record machine event:', error);
            throw new Error(`Failed to record event: ${error.message}`);
        }

        return data as string;
    }

    /**
     * Ottieni timeline degli eventi per una macchina
     * @param limit Numero massimo di eventi da recuperare (default 50)
     */
    static async getTimeline(
        equipmentId: string,  // ✅ Cambiato da machineId
        organizationId: string,
        limit = 50
    ): Promise<MachineEvent[]> {
        // Using imported supabase client

        const { data, error } = await supabase
            .from('machine_events')
            .select('*')
            .eq('equipment_id', equipmentId)  // ✅ Cambiato da machine_id
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .order('sequence_number', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Failed to load timeline:', error);
            throw new Error(`Failed to load timeline: ${error.message}`);
        }

        return (data || []) as MachineEvent[];
    }

    /**
     * Verifica l'integrità della hash chain
     * @returns Stato di validità e lista di eventi corrotti (se presenti)
     */
    static async verifyIntegrity(
        equipmentId: string,  // ✅ Cambiato da machineId
        organizationId: string
    ): Promise<{
        isValid: boolean;
        totalEvents: number;
        validEvents: number;
        corruptedEvents: EventVerification[];
    }> {
        // Using imported supabase client

        const { data, error } = await supabase.rpc('verify_machine_event_chain', {
            p_equipment_id: equipmentId,  // ✅ Cambiato da p_machine_id
            p_organization_id: organizationId,
        });

        if (error) {
            console.error('Failed to verify chain:', error);
            throw new Error(`Failed to verify chain: ${error.message}`);
        }

        const events = (data || []) as EventVerification[];
        const corrupted = events.filter((e) => !e.is_valid);

        return {
            isValid: corrupted.length === 0,
            totalEvents: events.length,
            validEvents: events.length - corrupted.length,
            corruptedEvents: corrupted,
        };
    }

    /**
     * Ricostruisci lo stato della macchina a un dato momento
     * @param atTimestamp Momento temporale (default: ora)
     */
    static async reconstructState(
        equipmentId: string,  // ✅ Cambiato da machineId
        organizationId: string,
        atTimestamp?: Date
    ): Promise<Record<string, any>> {
        // Using imported supabase client

        const { data, error } = await supabase.rpc('reconstruct_machine_state', {
            p_equipment_id: equipmentId,  // ✅ Cambiato da p_machine_id
            p_organization_id: organizationId,
            p_at_timestamp: atTimestamp?.toISOString() || new Date().toISOString(),
        });

        if (error) {
            console.error('Failed to reconstruct state:', error);
            throw new Error(`Failed to reconstruct state: ${error.message}`);
        }

        return (data || {}) as Record<string, any>;
    }

    /**
     * Ottieni statistiche eventi per organizzazione
     * @param dateFrom Data di inizio (default: ultimi 30 giorni)
     */
    static async getStats(
        organizationId: string,
        dateFrom?: Date
    ): Promise<Record<string, number>> {
        // Using imported supabase client

        let query = supabase
            .from('machine_events')
            .select('event_type')
            .eq('organization_id', organizationId);

        if (dateFrom) {
            query = query.gte('created_at', dateFrom.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            console.error('Failed to load stats:', error);
            throw new Error(`Failed to load stats: ${error.message}`);
        }

        // Raggruppa per event_type
        const stats: Record<string, number> = {};
        (data || []).forEach((event: { event_type: string }) => {
            stats[event.event_type] = (stats[event.event_type] || 0) + 1;
        });

        return stats;
    }

    /**
     * Ottieni eventi recenti per tutte le macchine (vista aggregata)
     */
    static async getRecentEvents(
        organizationId: string,
        limit = 20
    ): Promise<any[]> {
        // Using imported supabase client

        const { data, error } = await supabase
            .from('recent_machine_events')
            .select('*')
            .eq('organization_id', organizationId)
            .limit(limit);

        if (error) {
            console.error('Failed to load recent events:', error);
            throw new Error(`Failed to load recent events: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Ottieni singolo evento per ID
     */
    static async getEventById(
        eventId: string,
        organizationId: string
    ): Promise<MachineEvent | null> {
        // Using imported supabase client

        const { data, error } = await supabase.rpc('get_machine_event', {
            p_event_id: eventId,
            p_organization_id: organizationId,
        });

        if (error) {
            console.error('Failed to load event:', error);
            return null;
        }

        return data as MachineEvent | null;
    }
}

/**
 * Event Types Costanti
 * Usa questi per type-safety quando registri eventi
 */
export const EVENT_TYPES = {
    // Machine Lifecycle
    MACHINE_CREATED: 'machine.created',
    MACHINE_UPDATED: 'machine.updated',
    MACHINE_RELOCATED: 'machine.relocated',
    MACHINE_STATUS_CHANGED: 'machine.status_changed',
    MACHINE_DECOMMISSIONED: 'machine.decommissioned',
    MACHINE_TRANSFERRED: 'machine.transferred',

    // Maintenance
    MAINTENANCE_SCHEDULED: 'maintenance.scheduled',
    MAINTENANCE_STARTED: 'maintenance.started',
    MAINTENANCE_COMPLETED: 'maintenance.completed',
    MAINTENANCE_CANCELLED: 'maintenance.cancelled',
    MAINTENANCE_OVERDUE: 'maintenance.overdue',

    // Documents
    DOCUMENT_UPLOADED: 'document.uploaded',
    DOCUMENT_UPDATED: 'document.updated',
    DOCUMENT_DELETED: 'document.deleted',

    // Checklists
    CHECKLIST_EXECUTED: 'checklist.executed',
    CHECKLIST_ITEM_CHECKED: 'checklist.item_checked',

    // Safety
    SAFETY_INCIDENT_REPORTED: 'safety.incident_reported',
    SAFETY_RISK_ASSESSED: 'safety.risk_assessed',
    SAFETY_INSPECTION_COMPLETED: 'safety.inspection_completed',

    // Compliance
    COMPLIANCE_AUDIT_PASSED: 'compliance.audit_passed',
    COMPLIANCE_AUDIT_FAILED: 'compliance.audit_failed',
    COMPLIANCE_CERTIFICATE_ISSUED: 'compliance.certificate_issued',
    COMPLIANCE_CERTIFICATE_EXPIRED: 'compliance.certificate_expired',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

/**
 * Helper per creare payload tipizzati
 */
export const EventPayloads = {
    machineRelocated: (oldLocation: string, newLocation: string, reason?: string) => ({
        old_location: oldLocation,
        new_location: newLocation,
        reason,
        timestamp: new Date().toISOString(),
    }),

    maintenanceCompleted: (data: {
        technician: string;
        duration_hours: number;
        parts_replaced?: string[];
        cost?: number;
        notes?: string;
    }) => ({
        ...data,
        completed_at: new Date().toISOString(),
    }),

    documentUploaded: (data: {
        document_type: string;
        filename: string;
        file_size_kb: number;
        uploaded_by: string;
    }) => ({
        ...data,
        uploaded_at: new Date().toISOString(),
    }),

    safetyIncident: (data: {
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        reported_by: string;
        immediate_action_taken?: string;
    }) => ({
        ...data,
        reported_at: new Date().toISOString(),
    }),

    complianceCertificate: (data: {
        certificate_type: string;
        certificate_number: string;
        issue_date: string;
        expiry_date: string;
        issued_by: string;
        standards?: string[];
    }) => data,
};