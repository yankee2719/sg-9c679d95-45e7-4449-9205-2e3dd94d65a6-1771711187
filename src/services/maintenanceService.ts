// ============================================================================
// MAINTENANCE SERVICE
// ============================================================================
// Business logic per Maintenance Plans e Work Orders
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type MaintenancePlanType = 'time_based' | 'usage_based' | 'condition_based' | 'predictive';
export type MaintenancePriority = 'critical' | 'high' | 'medium' | 'low';
export type WorkOrderStatus = 
  | 'draft' 
  | 'scheduled' 
  | 'assigned' 
  | 'in_progress' 
  | 'paused' 
  | 'completed' 
  | 'approved' 
  | 'cancelled';

export interface MaintenancePlan {
  id: string;
  organization_id: string;
  plant_id?: string;
  equipment_id: string;
  
  title: string;
  description?: string;
  plan_type: MaintenancePlanType;
  priority: MaintenancePriority;
  
  frequency_days?: number;
  frequency_hours?: number;
  usage_threshold?: number;
  usage_unit?: string;
  
  estimated_duration_minutes?: number;
  required_skills?: string[];
  checklist_template?: any;
  required_parts?: any;
  required_tools?: string[];
  
  safety_notes?: string;
  requires_shutdown: boolean;
  compliance_tags?: string[];
  
  is_active: boolean;
  next_due_date?: string;
  last_generated_at?: string;
  
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: string;
  wo_number: string;
  
  organization_id: string;
  plant_id: string;
  equipment_id: string;
  
  maintenance_plan_id?: string;
  parent_event_id?: string;
  
  title: string;
  description?: string;
  priority: MaintenancePriority;
  wo_type: string;
  
  scheduled_start?: string;
  scheduled_end?: string;
  estimated_duration_minutes?: number;
  
  assigned_to?: string;
  assigned_at?: string;
  assigned_by?: string;
  
  actual_start?: string;
  actual_end?: string;
  actual_duration_minutes?: number;
  
  checklist?: ChecklistItem[];
  checklist_completion_percentage: number;
  
  parts_used?: PartUsed[];
  labor_hours?: number;
  external_cost?: number;
  total_cost?: number;
  
  downtime_minutes: number;
  downtime_reason?: string;
  production_impact?: string;
  
  work_performed?: string;
  findings?: string;
  recommendations?: string;
  
  photo_urls?: string[];
  document_ids?: string[];
  
  technician_signature?: Signature;
  supervisor_signature?: Signature;
  
  status: WorkOrderStatus;
  status_changed_at: string;
  status_changed_by?: string;
  
  approved_at?: string;
  approved_by?: string;
  is_closed: boolean;
  closed_at?: string;
  
  completion_event_id?: string;
  
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
}

export interface PartUsed {
  part_id?: string;
  part_number: string;
  name: string;
  quantity: number;
  unit_cost?: number;
}

export interface Signature {
  signed_by: string;
  signed_at: string;
  signature_data?: string; // Base64 or URL
}

export interface CreateMaintenancePlanInput {
  equipment_id: string;
  plant_id?: string;
  title: string;
  description?: string;
  plan_type: MaintenancePlanType;
  priority?: MaintenancePriority;
  frequency_days?: number;
  frequency_hours?: number;
  usage_threshold?: number;
  usage_unit?: string;
  estimated_duration_minutes?: number;
  required_skills?: string[];
  checklist_template?: any;
  required_parts?: any;
  required_tools?: string[];
  safety_notes?: string;
  requires_shutdown?: boolean;
  compliance_tags?: string[];
}

export interface CreateWorkOrderInput {
  equipment_id: string;
  plant_id: string;
  maintenance_plan_id?: string;
  title: string;
  description?: string;
  priority?: MaintenancePriority;
  wo_type: string;
  scheduled_start?: string;
  scheduled_end?: string;
  estimated_duration_minutes?: number;
}

export interface UpdateWorkOrderInput {
  title?: string;
  description?: string;
  priority?: MaintenancePriority;
  scheduled_start?: string;
  scheduled_end?: string;
  assigned_to?: string;
  checklist?: ChecklistItem[];
  parts_used?: PartUsed[];
  labor_hours?: number;
  external_cost?: number;
  downtime_minutes?: number;
  downtime_reason?: string;
  production_impact?: string;
  work_performed?: string;
  findings?: string;
  recommendations?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class MaintenanceService {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  // ==========================================================================
  // MAINTENANCE PLANS
  // ==========================================================================

  async createMaintenancePlan(
    input: CreateMaintenancePlanInput,
    userId: string,
    organizationId: string
  ): Promise<MaintenancePlan> {
    const { data, error } = await this.supabase
      .from('maintenance_plans')
      .insert({
        organization_id: organizationId,
        ...input,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getMaintenancePlansByEquipment(equipmentId: string): Promise<MaintenancePlan[]> {
    const { data, error } = await this.supabase
      .from('maintenance_plans')
      .select('*')
      .eq('equipment_id', equipmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getMaintenancePlansDue(organizationId: string): Promise<MaintenancePlan[]> {
    const { data, error } = await this.supabase
      .from('maintenance_plans')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .lte('next_due_date', new Date().toISOString())
      .order('next_due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async updateMaintenancePlan(
    planId: string,
    updates: Partial<CreateMaintenancePlanInput>
  ): Promise<MaintenancePlan> {
    const { data, error } = await this.supabase
      .from('maintenance_plans')
      .update(updates)
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deactivateMaintenancePlan(planId: string): Promise<void> {
    const { error } = await this.supabase
      .from('maintenance_plans')
      .update({ is_active: false })
      .eq('id', planId);

    if (error) throw error;
  }

  // ==========================================================================
  // WORK ORDERS
  // ==========================================================================

  async createWorkOrder(
    input: CreateWorkOrderInput,
    userId: string,
    organizationId: string
  ): Promise<WorkOrder> {
    // Generate WO number
    const woNumber = await this.generateWONumber(organizationId);

    const { data, error } = await this.supabase
      .from('work_orders')
      .insert({
        organization_id: organizationId,
        wo_number: woNumber,
        ...input,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWorkOrderById(woId: string): Promise<WorkOrder | null> {
    const { data, error } = await this.supabase
      .from('work_orders')
      .select('*')
      .eq('id', woId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  async getWorkOrdersByEquipment(
    equipmentId: string,
    filters?: {
      status?: WorkOrderStatus[];
      startDate?: string;
      endDate?: string;
    }
  ): Promise<WorkOrder[]> {
    let query = this.supabase
      .from('work_orders')
      .select('*')
      .eq('equipment_id', equipmentId);

    if (filters?.status) {
      query = query.in('status', filters.status);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getMyWorkOrders(userId: string): Promise<WorkOrder[]> {
    const { data, error } = await this.supabase
      .from('work_orders')
      .select('*')
      .eq('assigned_to', userId)
      .in('status', ['assigned', 'in_progress', 'paused'])
      .order('priority', { ascending: true })
      .order('scheduled_start', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async updateWorkOrder(
    woId: string,
    updates: UpdateWorkOrderInput,
    userId: string
  ): Promise<WorkOrder> {
    // Check if work order is closed
    const wo = await this.getWorkOrderById(woId);
    if (wo?.is_closed) {
      throw new Error('Cannot update closed work order');
    }

    const { data, error } = await this.supabase
      .from('work_orders')
      .update(updates)
      .eq('id', woId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async transitionWorkOrderStatus(
    woId: string,
    newStatus: WorkOrderStatus,
    userId: string,
    reason?: string,
    metadata?: any
  ): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('transition_work_order_status', {
      p_work_order_id: woId,
      p_new_status: newStatus,
      p_changed_by: userId,
      p_reason: reason,
      p_metadata: metadata,
    });

    if (error) throw error;
    return data;
  }

  async assignWorkOrder(woId: string, technicianId: string, assignedBy: string): Promise<WorkOrder> {
    const { data, error } = await this.supabase
      .from('work_orders')
      .update({
        assigned_to: technicianId,
        assigned_by: assignedBy,
      })
      .eq('id', woId)
      .select()
      .single();

    if (error) throw error;

    // Transition to assigned
    await this.transitionWorkOrderStatus(woId, 'assigned', assignedBy, 'Assigned to technician');

    return data;
  }

  async updateChecklist(
    woId: string,
    checklist: ChecklistItem[],
    userId: string
  ): Promise<WorkOrder> {
    const completedCount = checklist.filter(item => item.completed).length;
    const percentage = Math.round((completedCount / checklist.length) * 100);

    const { data, error } = await this.supabase
      .from('work_orders')
      .update({
        checklist,
        checklist_completion_percentage: percentage,
      })
      .eq('id', woId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async addSignature(
    woId: string,
    signatureType: 'technician' | 'supervisor',
    signatureData: Signature
  ): Promise<WorkOrder> {
    const field = signatureType === 'technician' 
      ? 'technician_signature' 
      : 'supervisor_signature';

    const { data, error } = await this.supabase
      .from('work_orders')
      .update({ [field]: signatureData })
      .eq('id', woId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWorkOrderStatusHistory(woId: string) {
    const { data, error } = await this.supabase
      .from('work_order_status_history')
      .select('*')
      .eq('work_order_id', woId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  private async generateWONumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    
    // Get count for this year
    const { count } = await this.supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', `${year}-01-01`)
      .lte('created_at', `${year}-12-31`);

    const sequence = (count || 0) + 1;
    return `WO-${year}-${sequence.toString().padStart(6, '0')}`;
  }

  async searchWorkOrders(
    organizationId: string,
    query: string,
    filters?: {
      status?: WorkOrderStatus[];
      priority?: MaintenancePriority[];
      equipmentId?: string;
    }
  ): Promise<WorkOrder[]> {
    let dbQuery = this.supabase
      .from('work_orders')
      .select('*')
      .eq('organization_id', organizationId)
      .textSearch('fts', query, { config: 'english' });

    if (filters?.status) {
      dbQuery = dbQuery.in('status', filters.status);
    }

    if (filters?.priority) {
      dbQuery = dbQuery.in('priority', filters.priority);
    }

    if (filters?.equipmentId) {
      dbQuery = dbQuery.eq('equipment_id', filters.equipmentId);
    }

    const { data, error } = await dbQuery.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

// Singleton instance
let maintenanceServiceInstance: MaintenanceService | null = null;

export function getMaintenanceService(): MaintenanceService {
  if (!maintenanceServiceInstance) {
    maintenanceServiceInstance = new MaintenanceService();
  }
  return maintenanceServiceInstance;
}