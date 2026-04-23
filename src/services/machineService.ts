// src/services/machineService.ts
// ============================================================================
// MACHINE SERVICE — replaces equipmentService.ts
// ============================================================================
// Changes from old equipmentService:
//   - Table: equipment → machines
//   - Added: plant_id (NOT NULL), lifecycle_state, manufacturer_id, qr_code
//   - Added: soft-delete (is_archived) instead of hard delete
//   - Removed: tenant_id (access via org membership + plant hierarchy)
//   - Removed: getCurrentTenantId() — RLS handles filtering
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

export type MachineLifecycle = 'commissioning' | 'active' | 'maintenance' | 'decommissioned' | 'transferred';

export interface Machine {
    id: string;
    plant_id: string;
    organization_id: string;
    name: string;
    serial_number: string | null;
    internal_code: string | null;
    category: string | null;
    subcategory: string | null;
    brand: string | null;
    model: string | null;
    year_of_manufacture: number | null;
    manufacturer_id: string | null;
    lifecycle_state: MachineLifecycle;
    commissioned_at: string | null;
    decommissioned_at: string | null;
    area: string | null;
    position: string | null;
    specifications: Record<string, any>;
    qr_code_token: string | null;
    photo_url: string | null;
    notes: string | null;
    tags: string[];
    is_archived: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateMachineParams {
    plant_id: string;
    organization_id: string;
    name: string;
    serial_number?: string;
    internal_code?: string;
    category?: string;
    brand?: string;
    model?: string;
    year_of_manufacture?: number;
    manufacturer_id?: string;
    area?: string;
    position?: string;
    specifications?: Record<string, any>;
    notes?: string;
    tags?: string[];
}

export interface MachineWithRelations extends Machine {
    plant?: { id: string; name: string; code: string | null };
    organization?: { id: string; name: string; type: string };
}

export const machineService = {

    // ─── LIST ────────────────────────────────────────────────────────────

    async getMachinesByPlant(plantId: string): Promise<Machine[]> {
        const { data, error } = await supabase
            .from('machines')
            .select('*')
            .eq('plant_id', plantId)
            .eq('is_archived', false)
            .order('name');

        if (error) {
            console.error('Error fetching machines by plant:', error);
            return [];
        }
        return (data || []) as Machine[];
    },

    async getMachinesByOrganization(organizationId: string): Promise<MachineWithRelations[]> {
        const { data, error } = await supabase
            .from('machines')
            .select(`
                *,
                plant:plants (id, name, code)
            `)
            .eq('organization_id', organizationId)
            .eq('is_archived', false)
            .order('name');

        if (error) {
            console.error('Error fetching machines by org:', error);
            return [];
        }
        return (data as unknown as MachineWithRelations[]) || [];
    },

    async getAllAccessibleMachines(): Promise<MachineWithRelations[]> {
        // RLS filters automatically based on plant access
        const { data, error } = await supabase
            .from('machines')
            .select(`
                *,
                plant:plants (id, name, code)
            `)
            .eq('is_archived', false)
            .order('name');

        if (error) {
            console.error('Error fetching machines:', error);
            return [];
        }
        return (data as unknown as MachineWithRelations[]) || [];
    },

    // ─── GET ─────────────────────────────────────────────────────────────

    async getMachineById(id: string): Promise<MachineWithRelations | null> {
        const { data, error } = await supabase
            .from('machines')
            .select(`
                *,
                plant:plants (id, name, code),
                organization:organizations (id, name, type)
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching machine:', error);
            return null;
        }
        return data as unknown as MachineWithRelations;
    },

    async getMachineByQRCode(token: string): Promise<Machine | null> {
        const { data, error } = await supabase
            .from('machines')
            .select('*')
            .eq('qr_code_token', token)
            .eq('is_archived', false)
            .single();

        if (error) return null;
        return data as Machine;
    },

    // ─── CREATE ──────────────────────────────────────────────────────────

    async createMachine(params: CreateMachineParams): Promise<Machine | null> {
        const { data, error } = await supabase
            .from('machines')
            .insert({
                ...params,
                lifecycle_state: 'commissioning' as MachineLifecycle,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating machine:', error);
            return null;
        }
        return data as Machine;
    },

    // ─── UPDATE ──────────────────────────────────────────────────────────

    async updateMachine(id: string, updates: Partial<Machine>): Promise<Machine | null> {
        // Prevent updating immutable fields
        const { id: _, created_at, organization_id, ...safeUpdates } = updates as any;

        const { data, error } = await supabase
            .from('machines')
            .update(safeUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating machine:', error);
            return null;
        }
        return data as Machine;
    },

    // ─── LIFECYCLE ───────────────────────────────────────────────────────

    async changeLifecycleState(id: string, newState: MachineLifecycle): Promise<boolean> {
        const updates: Partial<Machine> = { lifecycle_state: newState };

        if (newState === 'active') {
            updates.commissioned_at = new Date().toISOString();
        } else if (newState === 'decommissioned') {
            updates.decommissioned_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from('machines')
            .update(updates)
            .eq('id', id);

        // Note: trigger on_machine_lifecycle_change auto-creates event
        return !error;
    },

    // ─── ARCHIVE (soft delete) ───────────────────────────────────────────

    async archiveMachine(id: string): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('machines')
            .update({
                is_archived: true,
                archived_at: new Date().toISOString(),
                archived_by: user?.id || null,
            })
            .eq('id', id);

        return !error;
    },

    async restoreMachine(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('machines')
            .update({
                is_archived: false,
                archived_at: null,
                archived_by: null,
            })
            .eq('id', id);

        return !error;
    },

    // ─── QR CODE ─────────────────────────────────────────────────────────

    async generateQRCode(machineId: string): Promise<string | null> {
        const token = crypto.randomUUID();

        const { error } = await supabase
            .from('machines')
            .update({
                qr_code_token: token,
                qr_code_generated_at: new Date().toISOString(),
            })
            .eq('id', machineId);

        if (error) {
            console.error('Error generating QR code:', error);
            return null;
        }
        return token;
    },

    // ─── SEARCH ──────────────────────────────────────────────────────────

    async searchMachines(query: string, organizationId?: string): Promise<Machine[]> {
        let q = supabase
            .from('machines')
            .select('*')
            .eq('is_archived', false)
            .or(`name.ilike.%${query}%,serial_number.ilike.%${query}%,internal_code.ilike.%${query}%,brand.ilike.%${query}%`);

        if (organizationId) {
            q = q.eq('organization_id', organizationId);
        }

        const { data, error } = await q.limit(20);

        if (error) return [];
        return (data || []) as Machine[];
    },

    // ─── STATISTICS ──────────────────────────────────────────────────────

    async getMachineStats(organizationId: string): Promise<{
        total: number;
        active: number;
        maintenance: number;
        decommissioned: number;
    }> {
        const { data, error } = await supabase
            .from('machines')
            .select('lifecycle_state')
            .eq('organization_id', organizationId)
            .eq('is_archived', false);

        if (error || !data) {
            return { total: 0, active: 0, maintenance: 0, decommissioned: 0 };
        }

        return {
            total: data.length,
            active: data.filter(m => m.lifecycle_state === 'active').length,
            maintenance: data.filter(m => m.lifecycle_state === 'maintenance').length,
            decommissioned: data.filter(m => m.lifecycle_state === 'decommissioned').length,
        };
    },
};