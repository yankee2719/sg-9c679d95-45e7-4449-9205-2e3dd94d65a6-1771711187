import { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "@/lib/apiAuth";

type ApiUser = AuthenticatedRequest["user"];

type WorkOrderStatus =
    | "draft"
    | "assigned"
    | "scheduled"
    | "in_progress"
    | "paused"
    | "completed"
    | "approved"
    | "cancelled";

type WorkType = "preventive" | "corrective" | "predictive" | "inspection" | "emergency";
type WorkPriority = "low" | "medium" | "high" | "critical";

function sanitizeWorkType(value?: string | null): WorkType {
    const normalized = `${value ?? ""}`.trim().toLowerCase();
    if (["preventive", "corrective", "predictive", "inspection", "emergency"].includes(normalized)) {
        return normalized as WorkType;
    }
    return "corrective";
}

function sanitizePriority(value?: string | null): WorkPriority {
    const normalized = `${value ?? ""}`.trim().toLowerCase();
    if (["low", "medium", "high", "critical"].includes(normalized)) {
        return normalized as WorkPriority;
    }
    return "medium";
}

async function canAccessMachineOrWorkOrder(
    supabase: SupabaseClient,
    user: ApiUser,
    params: { organizationId: string; machineId?: string | null }
) {
    if (!user.organizationId) return false;
    if (params.organizationId === user.organizationId) return true;
    if (!params.machineId) return false;

    const { data, error } = await supabase
        .from("machine_assignments")
        .select("id")
        .eq("machine_id", params.machineId)
        .eq("is_active", true)
        .or(
            `manufacturer_org_id.eq.${user.organizationId},customer_org_id.eq.${user.organizationId}`
        )
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return !!data;
}

export async function listWorkOrders(
    supabase: SupabaseClient,
    user: ApiUser,
    params: {
        machineId?: string | null;
        status?: string | string[] | null;
        myOrders?: boolean;
    }
) {
    if (!user.organizationId) {
        throw new Error("Active organization not found.");
    }

    let query = supabase
        .from("work_orders")
        .select(
            `
      id,
      organization_id,
      machine_id,
      plant_id,
      maintenance_plan_id,
      title,
      description,
      work_type,
      priority,
      status,
      scheduled_date,
      scheduled_start_time,
      due_date,
      assigned_to,
      started_at,
      completed_at,
      actual_duration_minutes,
      work_performed,
      findings,
      spare_parts_used,
      completed_by,
      reviewed_by,
      reviewed_at,
      signature_data,
      labor_cost,
      parts_cost,
      total_cost,
      notes,
      photos,
      created_at,
      updated_at,
      created_by,
      machine:machines (id, name, internal_code),
      plant:plants (id, name),
      assignee:profiles!work_orders_assigned_to_fkey (id, display_name, email)
    `
        )
        .order("created_at", { ascending: false });

    if (params.myOrders) {
        query = query.eq("assigned_to", user.id);
    } else {
        query = query.eq("organization_id", user.organizationId);
    }

    if (params.machineId) {
        query = query.eq("machine_id", params.machineId);
    }

    const statuses = Array.isArray(params.status)
        ? params.status.filter(Boolean)
        : params.status
            ? [params.status]
            : [];

    if (statuses.length === 1) {
        query = query.eq("status", statuses[0]);
    } else if (statuses.length > 1) {
        query = query.in("status", statuses);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as any[];
    const normalized = rows.map((row) => ({
        ...row,
        wo_number: row.id.slice(0, 8).toUpperCase(),
        scheduled_start: row.scheduled_start_time,
    }));

    return normalized;
}

export async function getWorkOrderById(supabase: SupabaseClient, user: ApiUser, id: string) {
    const { data, error } = await supabase
        .from("work_orders")
        .select(
            `
      id,
      organization_id,
      machine_id,
      plant_id,
      maintenance_plan_id,
      title,
      description,
      work_type,
      priority,
      status,
      scheduled_date,
      scheduled_start_time,
      due_date,
      assigned_to,
      started_at,
      completed_at,
      actual_duration_minutes,
      work_performed,
      findings,
      spare_parts_used,
      completed_by,
      reviewed_by,
      reviewed_at,
      signature_data,
      labor_cost,
      parts_cost,
      total_cost,
      notes,
      photos,
      created_at,
      updated_at,
      created_by,
      machine:machines (id, name, internal_code, serial_number, plant_id),
      plant:plants (id, name, code),
      assignee:profiles!work_orders_assigned_to_fkey (id, display_name, email)
    `
        )
        .eq("id", id)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const canAccess = await canAccessMachineOrWorkOrder(supabase, user, {
        organizationId: (data as any).organization_id,
        machineId: (data as any).machine_id ?? null,
    });

    if (!canAccess) {
        throw new Error("Work order not accessible in the active organization context.");
    }

    return {
        ...(data as any),
        wo_number: id.slice(0, 8).toUpperCase(),
        scheduled_start: (data as any).scheduled_start_time ?? null,
    };
}

export async function createWorkOrder(
    supabase: SupabaseClient,
    user: ApiUser,
    body: Record<string, any>
) {
    if (!user.organizationId) {
        throw new Error("Active organization not found.");
    }

    const machineId = body.machine_id ?? body.equipment_id ?? null;
    if (!machineId || typeof machineId !== "string") {
        throw new Error("machine_id is required");
    }
    if (!body.title || typeof body.title !== "string") {
        throw new Error("title is required");
    }

    const { data: machine, error: machineError } = await supabase
        .from("machines")
        .select("id, organization_id, plant_id")
        .eq("id", machineId)
        .maybeSingle();
    if (machineError) throw machineError;
    if (!machine) throw new Error("Machine not found.");
    if ((machine as any).organization_id !== user.organizationId) {
        throw new Error("Work orders can only be created for machines owned by the active organization.");
    }

    const payload: any = {
        organization_id: user.organizationId,
        machine_id: machineId,
        plant_id: body.plant_id ?? (machine as any).plant_id ?? null,
        maintenance_plan_id: body.maintenance_plan_id ?? null,
        title: body.title.trim(),
        description: body.description?.trim?.() || null,
        work_type: sanitizeWorkType(body.work_type ?? body.wo_type),
        priority: sanitizePriority(body.priority),
        scheduled_date: body.scheduled_date ?? null,
        scheduled_start_time: body.scheduled_start_time ?? body.scheduled_start ?? null,
        due_date: body.due_date ?? null,
        assigned_to: body.assigned_to ?? null,
        created_by: user.id,
        notes: body.notes?.trim?.() || null,
    };

    const { data, error } = await supabase
        .from("work_orders")
        .insert(payload)
        .select("id")
        .single();

    if (error) throw error;
    return getWorkOrderById(supabase, user, (data as any).id);
}

export async function updateWorkOrder(
    supabase: SupabaseClient,
    user: ApiUser,
    id: string,
    body: Record<string, any>
) {
    const existing = await getWorkOrderById(supabase, user, id);
    if (!existing) {
        throw new Error("Work order not found.");
    }

    if (["completed", "cancelled", "approved"].includes(existing.status)) {
        throw new Error("Closed work orders cannot be modified.");
    }

    if (existing.organization_id !== user.organizationId) {
        throw new Error("Only the owning organization can edit this work order.");
    }

    const updates: Record<string, any> = {};
    const allowedKeys = [
        "title",
        "description",
        "priority",
        "status",
        "scheduled_date",
        "due_date",
        "assigned_to",
        "work_performed",
        "findings",
        "notes",
        "actual_duration_minutes",
        "labor_cost",
        "parts_cost",
        "total_cost",
    ];

    for (const key of allowedKeys) {
        if (body[key] !== undefined) {
            updates[key] = body[key];
        }
    }

    if (body.work_type !== undefined || body.wo_type !== undefined) {
        updates.work_type = sanitizeWorkType(body.work_type ?? body.wo_type);
    }
    if (body.priority !== undefined) {
        updates.priority = sanitizePriority(body.priority);
    }
    if (body.scheduled_start_time !== undefined || body.scheduled_start !== undefined) {
        updates.scheduled_start_time = body.scheduled_start_time ?? body.scheduled_start;
    }

    if (Object.keys(updates).length === 0) {
        return existing;
    }

    const { error } = await supabase
        .from("work_orders")
        .update(updates)
        .eq("id", id);
    if (error) throw error;

    return getWorkOrderById(supabase, user, id);
}

export async function assignWorkOrder(
    supabase: SupabaseClient,
    user: ApiUser,
    id: string,
    technicianId: string
) {
    const existing = await getWorkOrderById(supabase, user, id);
    if (!existing) throw new Error("Work order not found.");
    if (existing.organization_id !== user.organizationId) {
        throw new Error("Only the owning organization can assign this work order.");
    }

    const { data: membership, error: membershipError } = await supabase
        .from("organization_memberships")
        .select("user_id")
        .eq("organization_id", existing.organization_id)
        .eq("user_id", technicianId)
        .eq("is_active", true)
        .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) throw new Error("Selected technician is not an active member of the work order organization.");

    const nextStatus = existing.status === "draft" ? "assigned" : existing.status;
    const { error } = await supabase
        .from("work_orders")
        .update({ assigned_to: technicianId, status: nextStatus })
        .eq("id", id);
    if (error) throw error;

    return getWorkOrderById(supabase, user, id);
}

export async function transitionWorkOrder(
    supabase: SupabaseClient,
    user: ApiUser,
    id: string,
    newStatus: WorkOrderStatus,
    reason?: string | null
) {
    const existing = await getWorkOrderById(supabase, user, id);
    if (!existing) throw new Error("Work order not found.");

    if (user.role === "technician") {
        if (existing.assigned_to !== user.id) {
            throw new Error("Technicians can only transition work orders assigned to them.");
        }
        if (!["in_progress", "paused", "completed"].includes(newStatus)) {
            throw new Error("Technicians can only move work orders to in_progress, paused, or completed.");
        }
    } else if (existing.organization_id !== user.organizationId) {
        throw new Error("Only the owning organization can transition this work order.");
    }

    const updates: Record<string, any> = { status: newStatus };
    const now = new Date().toISOString();

    if (newStatus === "in_progress" && !existing.started_at) {
        updates.started_at = now;
    }
    if (newStatus === "completed") {
        updates.completed_at = now;
        updates.completed_by = user.id;
        if (reason) updates.notes = reason;
    }
    if (newStatus === "cancelled" && reason) {
        updates.notes = reason;
    }

    const { error } = await supabase.from("work_orders").update(updates).eq("id", id);
    if (error) throw error;

    return getWorkOrderById(supabase, user, id);
}
