// src/services/maintenanceService.ts
// ============================================================================
// MAINTENANCE SERVICE — replaces old maintenanceService.ts
// ============================================================================
// Changes:
//   - Split into two domains: Maintenance Plans + Work Orders
//   - maintenance_schedules → maintenance_plans (preventive templates)
//   - maintenance_logs → work_orders (execution instances)
//   - Removed: tenant_id filtering (RLS handles it)
//   - Added: work_order_status workflow (draft→scheduled→in_progress→completed)
//   - Added: immutable closure (completed work orders cannot be modified)
//   - Added: auto-event generation on completion (via DB trigger)
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

export type WorkOrderStatus = 'draft' | 'assigned' | 'scheduled' | 'in_progress' | 'paused' | 'pending_review' | 'completed' | 'approved' | 'cancelled';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';
export type MaintenancePriority = WorkOrderPriority;
export type WorkType = 'preventive' | 'corrective' | 'predictive' | 'inspection' | 'emergency';
export type MaintenancePlanType = 'time_based' | 'usage_based' | 'condition_based';

export interface ChecklistItem {
    id: string;
    label: string;
    checked: boolean;
    notes?: string;
}

// ============================================================================
// TYPES — MAINTENANCE PLANS
// ============================================================================

export interface MaintenancePlan {
    id: string;
    organization_id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    plan_type: MaintenancePlanType;
    frequency_type: string;
    frequency_value: number;
    frequency_days: number | null;
    frequency_hours: number | null;
    usage_threshold: number | null;
    usage_unit: string | null;
    estimated_duration_minutes: number | null;
    required_skills: string[] | null;
    required_tools: string[] | null;
    requires_shutdown: boolean;
    compliance_tags: string[] | null;
    spare_parts: any[];
    instructions: string | null;
    safety_notes: string | null;
    default_assignee_id: string | null;
    priority: WorkOrderPriority;
    is_active: boolean;
    next_due_date: string | null;
    last_executed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreatePlanParams {
    organization_id: string;
    machine_id?: string;
    title: string;
    description?: string;
    frequency_type: string;
    frequency_value: number;
    estimated_duration_minutes?: number;
    instructions?: string;
    safety_notes?: string;
    priority?: WorkOrderPriority;
    default_assignee_id?: string;
    next_due_date?: string;
}

// ============================================================================
// TYPES — WORK ORDERS
// ============================================================================

export interface WorkOrder {
    id: string;
    organization_id: string;
    machine_id: string;
    plant_id: string;
    maintenance_plan_id: string | null;
    wo_number: string | null;
    wo_type: string;
    title: string;
    description: string | null;
    work_type: WorkType;
    priority: WorkOrderPriority;
    status: WorkOrderStatus;
    scheduled_date: string | null;
    scheduled_start: string | null;
    scheduled_end: string | null;
    due_date: string | null;
    assigned_to: string | null;
    started_at: string | null;
    completed_at: string | null;
    actual_duration_minutes: number | null;
    estimated_duration_minutes: number | null;
    labor_hours: number | null;
    work_performed: string | null;
    findings: string | null;
    recommendations: string | null;
    spare_parts_used: any[];
    parts_used: any[];
    completed_by: string | null;
    reviewed_by: string | null;
    signature_data: any | null;
    labor_cost: number | null;
    parts_cost: number | null;
    external_cost: number | null;
    total_cost: number | null;
    notes: string | null;
    photos: string[];
    photo_urls: string[];
    checklist: any | null;
    checklist_completion_percentage: number | null;
    is_closed: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateWorkOrderParams {
    organization_id?: string;
    machine_id?: string;
    equipment_id?: string;
    plant_id: string;
    maintenance_plan_id?: string;
    title: string;
    description?: string;
    work_type?: WorkType;
    wo_type?: string;
    priority?: WorkOrderPriority;
    scheduled_date?: string;
    scheduled_start?: string;
    scheduled_end?: string;
    estimated_duration_minutes?: number;
    due_date?: string;
    assigned_to?: string;
}
export type CreateWorkOrderInput = CreateWorkOrderParams;

export interface CompleteWorkOrderParams {
    work_performed: string;
    findings?: string;
    actual_duration_minutes?: number;
    spare_parts_used?: any[];
    labor_cost?: number;
    parts_cost?: number;
    notes?: string;
}

export interface WorkOrderWithRelations extends WorkOrder {
    machine?: { id: string; name: string; internal_code: string | null };
    plant?: { id: string; name: string };
    assignee?: { id: string; display_name: string; email: string };
}

// ============================================================================
// SERVICE — MAINTENANCE PLANS
// ============================================================================

export const maintenancePlanService = {

    async getPlans(organizationId: string, machineId?: string): Promise<MaintenancePlan[]> {
        let query = supabase
            .from('maintenance_plans')
            .select('*')
            .eq('organization_id', organizationId)
            .order('next_due_date', { ascending: true, nullsFirst: false });

        if (machineId) {
            query = query.eq('machine_id', machineId);
        }

        const { data, error } = await query;
        if (error) return [];
        return data || [];
    },

    async getPlanById(id: string): Promise<MaintenancePlan | null> {
        const { data, error } = await supabase
            .from('maintenance_plans')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    },

    async createPlan(params: CreatePlanParams): Promise<MaintenancePlan | null> {
        const { data, error } = await supabase
            .from('maintenance_plans')
            .insert(params)
            .select()
            .single();

        if (error) {
            console.error('Error creating maintenance plan:', error);
            return null;
        }
        return data;
    },

    async updatePlan(id: string, updates: Partial<MaintenancePlan>): Promise<MaintenancePlan | null> {
        const { data, error } = await supabase
            .from('maintenance_plans')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) return null;
        return data;
    },

    async deactivatePlan(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('maintenance_plans')
            .update({ is_active: false })
            .eq('id', id);
        return !error;
    },

    async getOverduePlans(organizationId: string): Promise<MaintenancePlan[]> {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('maintenance_plans')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .lt('next_due_date', today)
            .order('next_due_date');

        if (error) return [];
        return data || [];
    },
};

// ============================================================================
// SERVICE — WORK ORDERS
// ============================================================================

export const workOrderService = {

    // ─── LIST ────────────────────────────────────────────────────────────

    async getWorkOrders(
        organizationId: string,
        filters?: {
            machineId?: string;
            plantId?: string;
            status?: WorkOrderStatus | WorkOrderStatus[];
            assignedTo?: string;
            workType?: WorkType;
        }
    ): Promise<WorkOrderWithRelations[]> {
        let query = supabase
            .from('work_orders')
            .select(`
                *,
                machine:machines (id, name, internal_code),
                plant:plants (id, name),
                assignee:profiles!work_orders_assigned_to_fkey (id, display_name, email)
            `)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (filters?.machineId) query = query.eq('machine_id', filters.machineId);
        if (filters?.plantId) query = query.eq('plant_id', filters.plantId);
        if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
        if (filters?.workType) query = query.eq('work_type', filters.workType);

        if (filters?.status) {
            if (Array.isArray(filters.status)) {
                query = query.in('status', filters.status);
            } else {
                query = query.eq('status', filters.status);
            }
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching work orders:', error);
            return [];
        }
        return (data as unknown as WorkOrderWithRelations[]) || [];
    },

    async getActiveWorkOrders(organizationId: string): Promise<WorkOrderWithRelations[]> {
        return this.getWorkOrders(organizationId, {
            status: ['draft', 'scheduled', 'in_progress', 'pending_review'],
        });
    },

    async getMyWorkOrders(): Promise<WorkOrderWithRelations[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('work_orders')
            .select(`
                *,
                machine:machines (id, name, internal_code),
                plant:plants (id, name)
            `)
            .eq('assigned_to', user.id)
            .not('status', 'in', '("completed","cancelled")')
            .order('scheduled_date', { ascending: true, nullsFirst: false });

        if (error) return [];
        return (data as unknown as WorkOrderWithRelations[]) || [];
    },

    // ─── GET ─────────────────────────────────────────────────────────────

    async getWorkOrderById(id: string): Promise<WorkOrderWithRelations | null> {
        const { data, error } = await supabase
            .from('work_orders')
            .select(`
                *,
                machine:machines (id, name, internal_code, serial_number, plant_id),
                plant:plants (id, name, code),
                assignee:profiles!work_orders_assigned_to_fkey (id, display_name, email)
            `)
            .eq('id', id)
            .single();

        if (error) return null;
        return data as unknown as WorkOrderWithRelations;
    },

    // ─── CREATE ──────────────────────────────────────────────────────────

    async createWorkOrder(params: CreateWorkOrderParams): Promise<WorkOrder | null> {
        const { data, error } = await supabase
            .from('work_orders')
            .insert({
                ...params,
                status: 'draft' as WorkOrderStatus,
                priority: params.priority || 'medium',
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating work order:', error);
            return null;
        }
        return data;
    },

    async createFromPlan(planId: string, machineId: string): Promise<WorkOrder | null> {
        const plan = await maintenancePlanService.getPlanById(planId);
        if (!plan) return null;

        // Get machine to get plant_id
        const { data: machine } = await supabase
            .from('machines')
            .select('plant_id')
            .eq('id', machineId)
            .single();

        if (!machine) return null;

        return this.createWorkOrder({
            organization_id: plan.organization_id,
            machine_id: machineId,
            plant_id: machine.plant_id,
            maintenance_plan_id: planId,
            title: plan.title,
            description: plan.instructions || plan.description || undefined,
            work_type: 'preventive',
            priority: plan.priority,
            assigned_to: plan.default_assignee_id || undefined,
        });
    },

    // ─── STATUS TRANSITIONS ──────────────────────────────────────────────

    async scheduleWorkOrder(id: string, scheduledDate: string, assignedTo?: string): Promise<boolean> {
        const { error } = await supabase
            .from('work_orders')
            .update({
                status: 'scheduled' as WorkOrderStatus,
                scheduled_date: scheduledDate,
                assigned_to: assignedTo || undefined,
            })
            .eq('id', id)
            .in('status', ['draft']);

        return !error;
    },

    async startWorkOrder(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('work_orders')
            .update({
                status: 'in_progress' as WorkOrderStatus,
                started_at: new Date().toISOString(),
            })
            .eq('id', id)
            .in('status', ['draft', 'scheduled']);

        return !error;
    },

    async completeWorkOrder(id: string, params: CompleteWorkOrderParams): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const totalCost = (params.labor_cost || 0) + (params.parts_cost || 0);

        const { error } = await supabase
            .from('work_orders')
            .update({
                status: 'completed' as WorkOrderStatus,
                completed_at: new Date().toISOString(),
                completed_by: user.id,
                work_performed: params.work_performed,
                findings: params.findings || null,
                actual_duration_minutes: params.actual_duration_minutes || null,
                spare_parts_used: params.spare_parts_used || [],
                labor_cost: params.labor_cost || null,
                parts_cost: params.parts_cost || null,
                total_cost: totalCost || null,
                notes: params.notes || null,
            })
            .eq('id', id)
            .in('status', ['in_progress', 'pending_review']);

        // Note: DB trigger on_work_order_completed auto-generates machine event
        return !error;
    },

    async cancelWorkOrder(id: string, reason?: string): Promise<boolean> {
        const { error } = await supabase
            .from('work_orders')
            .update({
                status: 'cancelled' as WorkOrderStatus,
                notes: reason || null,
            })
            .eq('id', id)
            .not('status', 'eq', 'completed');

        return !error;
    },

    // ─── STATISTICS ──────────────────────────────────────────────────────

    async getWorkOrderStats(organizationId: string): Promise<{
        total: number;
        open: number;
        overdue: number;
        completedThisMonth: number;
    }> {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { data, error } = await supabase
            .from('work_orders')
            .select('status, due_date, completed_at')
            .eq('organization_id', organizationId);

        if (error || !data) return { total: 0, open: 0, overdue: 0, completedThisMonth: 0 };

        const today = now.toISOString().split('T')[0];

        return {
            total: data.length,
            open: data.filter(wo => !['completed', 'cancelled'].includes(wo.status)).length,
            overdue: data.filter(wo =>
                !['completed', 'cancelled'].includes(wo.status) &&
                wo.due_date && wo.due_date < today
            ).length,
            completedThisMonth: data.filter(wo =>
                wo.status === 'completed' &&
                wo.completed_at && wo.completed_at >= monthStart
            ).length,
        };
    },
};
