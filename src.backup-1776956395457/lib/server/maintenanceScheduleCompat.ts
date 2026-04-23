import type { SupabaseClient } from "@supabase/supabase-js";

export interface LegacyMaintenanceScheduleFilters {
    equipment_id?: string | null;
    status?: string | null;
    frequency?: string | null;
    assigned_to?: string | null;
    upcoming_days?: number | null;
    overdue?: boolean;
    page?: number;
    limit?: number;
    sort?: string;
    order?: "asc" | "desc";
}

function toIso(value: string | null | undefined) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

function profileDisplayName(profile: any) {
    return (
        profile?.display_name ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        profile?.email ||
        null
    );
}

function mapFrequencyValue(frequency: string | null | undefined): number {
    return 1;
}

export function calculateNextDueDate(
    frequencyType: string | null | undefined,
    frequencyValue: number | null | undefined,
    fromDate: Date
): Date {
    const next = new Date(fromDate);
    const amount = Math.max(Number(frequencyValue || 1), 1);

    switch (frequencyType) {
        case "daily":
            next.setDate(next.getDate() + amount);
            break;
        case "weekly":
            next.setDate(next.getDate() + (7 * amount));
            break;
        case "biweekly":
            next.setDate(next.getDate() + (14 * amount));
            break;
        case "monthly":
            next.setMonth(next.getMonth() + amount);
            break;
        case "quarterly":
            next.setMonth(next.getMonth() + (3 * amount));
            break;
        case "yearly":
            next.setFullYear(next.getFullYear() + amount);
            break;
        default:
            next.setDate(next.getDate() + (30 * amount));
            break;
    }

    return next;
}

export function mapPlanToLegacySchedule(plan: any, machine?: any, assignedUser?: any) {
    return {
        id: plan.id,
        equipment_id: plan.machine_id,
        title: plan.title,
        description: plan.description,
        frequency: plan.frequency_type,
        frequency_value: plan.frequency_value,
        next_due_date: plan.next_due_date,
        assigned_to: plan.default_assignee_id,
        checklist_id: null,
        priority: plan.priority,
        estimated_duration_minutes: plan.estimated_duration_minutes,
        notes: plan.instructions ?? null,
        status: plan.is_active ? "scheduled" : "inactive",
        created_at: plan.created_at,
        updated_at: plan.updated_at,
        last_completed: plan.last_executed_at,
        equipment: machine
            ? {
                id: machine.id,
                name: machine.name,
                equipment_code: machine.internal_code ?? null,
                location:
                    machine.position ??
                    machine.area ??
                    machine.plant?.name ??
                    null,
                category: machine.category ?? null,
                organization_id: machine.organization_id,
            }
            : null,
        assigned_user: assignedUser
            ? {
                id: assignedUser.id,
                full_name: profileDisplayName(assignedUser),
                email: assignedUser.email ?? null,
            }
            : null,
        checklist: null,
    };
}

async function loadMachinesByIds(supabase: SupabaseClient, machineIds: string[]) {
    if (machineIds.length === 0) return new Map < string, any > ();

    const { data, error } = await supabase
        .from("machines")
        .select("id, name, internal_code, position, area, category, organization_id, plant:plants(id, name)")
        .in("id", machineIds);

    if (error) throw error;
    return new Map((data ?? []).map((row: any) => [row.id, row]));
}

async function loadProfilesByIds(supabase: SupabaseClient, profileIds: string[]) {
    if (profileIds.length === 0) return new Map < string, any > ();

    const { data, error } = await supabase
        .from("profiles")
        .select("id, email, display_name, first_name, last_name")
        .in("id", profileIds);

    if (error) throw error;
    return new Map((data ?? []).map((row: any) => [row.id, row]));
}

export async function listLegacySchedules(
    supabase: SupabaseClient,
    organizationId: string | null,
    filters: LegacyMaintenanceScheduleFilters
) {
    let query = supabase
        .from("maintenance_plans")
        .select("*", { count: "exact" });

    if (organizationId) {
        query = query.eq("organization_id", organizationId);
    }

    if (filters.equipment_id) {
        query = query.eq("machine_id", filters.equipment_id);
    }
    if (filters.frequency) {
        query = query.eq("frequency_type", filters.frequency);
    }
    if (filters.assigned_to) {
        query = query.eq("default_assignee_id", filters.assigned_to);
    }
    if (filters.status === "scheduled") {
        query = query.eq("is_active", true);
    }
    if (filters.status === "inactive") {
        query = query.eq("is_active", false);
    }

    if (filters.upcoming_days) {
        const now = new Date();
        const future = new Date(now);
        future.setDate(future.getDate() + filters.upcoming_days);
        query = query
            .gte("next_due_date", now.toISOString())
            .lte("next_due_date", future.toISOString());
    }

    if (filters.overdue) {
        query = query.lt("next_due_date", new Date().toISOString());
    }

    const sortField =
        filters.sort === "created_at" ||
            filters.sort === "title" ||
            filters.sort === "next_due_date" ||
            filters.sort === "frequency_type"
            ? filters.sort
            : "next_due_date";

    query = query.order(sortField, { ascending: filters.order !== "desc" });

    const page = Math.max(filters.page || 1, 1);
    const limit = Math.max(Math.min(filters.limit || 20, 100), 1);
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: plans, error, count } = await query;
    if (error) throw error;

    const machineIds = Array.from(
        new Set((plans ?? []).map((plan: any) => plan.machine_id).filter(Boolean))
    );
    const assigneeIds = Array.from(
        new Set((plans ?? []).map((plan: any) => plan.default_assignee_id).filter(Boolean))
    );

    const [machinesById, profilesById] = await Promise.all([
        loadMachinesByIds(supabase, machineIds as string[]),
        loadProfilesByIds(supabase, assigneeIds as string[]),
    ]);

    const rows = (plans ?? []).map((plan: any) =>
        mapPlanToLegacySchedule(
            plan,
            plan.machine_id ? machinesById.get(plan.machine_id) : null,
            plan.default_assignee_id ? profilesById.get(plan.default_assignee_id) : null
        )
    );

    return {
        data: rows,
        pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        },
    };
}

export async function getLegacyScheduleById(
    supabase: SupabaseClient,
    id: string,
    organizationId: string | null,
    isPlatformAdmin = false
) {
    const { data: plan, error } = await supabase
        .from("maintenance_plans")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) throw error;
    if (!plan) return null;
    if (!isPlatformAdmin && organizationId && plan.organization_id !== organizationId) {
        return null;
    }

    const [machinesById, profilesById, logsResp] = await Promise.all([
        loadMachinesByIds(supabase, plan.machine_id ? [plan.machine_id] : []),
        loadProfilesByIds(supabase, plan.default_assignee_id ? [plan.default_assignee_id] : []),
        supabase
            .from("work_orders")
            .select("id, completed_at, started_at, actual_duration_minutes, work_performed, findings, notes, completed_by, status, created_at")
            .eq("maintenance_plan_id", plan.id)
            .order("completed_at", { ascending: false, nullsFirst: false })
            .limit(10),
    ]);

    if (logsResp.error) throw logsResp.error;

    const recentLogsRaw = logsResp.data ?? [];
    const performerIds = Array.from(
        new Set(recentLogsRaw.map((row: any) => row.completed_by).filter(Boolean))
    );
    const performersById = await loadProfilesByIds(supabase, performerIds as string[]);

    const recent_logs = recentLogsRaw.map((row: any) => ({
        id: row.id,
        status: row.status,
        completed_at: row.completed_at,
        created_at: row.created_at,
        duration_minutes: row.actual_duration_minutes,
        notes: row.notes ?? row.work_performed ?? row.findings ?? null,
        performed_by_user: row.completed_by
            ? {
                id: row.completed_by,
                full_name: profileDisplayName(performersById.get(row.completed_by)),
                email: performersById.get(row.completed_by)?.email ?? null,
            }
            : null,
    }));

    return {
        ...mapPlanToLegacySchedule(
            plan,
            plan.machine_id ? machinesById.get(plan.machine_id) : null,
            plan.default_assignee_id ? profilesById.get(plan.default_assignee_id) : null
        ),
        recent_logs,
    };
}

export async function createLegacySchedule(
    supabase: SupabaseClient,
    organizationId: string,
    createdBy: string,
    body: Record<string, any>
) {
    const machineId = typeof body.equipment_id === "string" ? body.equipment_id : null;
    if (!machineId) {
        throw new Error("equipment_id is required");
    }

    const { data: machine, error: machineError } = await supabase
        .from("machines")
        .select("id, organization_id")
        .eq("id", machineId)
        .maybeSingle();

    if (machineError) throw machineError;
    if (!machine || machine.organization_id !== organizationId) {
        throw new Error("Machine not found");
    }

    const payload = {
        organization_id: organizationId,
        machine_id: machineId,
        title: String(body.title ?? "").trim(),
        description: body.description ? String(body.description) : null,
        frequency_type: body.frequency ? String(body.frequency) : "monthly",
        frequency_value: mapFrequencyValue(body.frequency),
        estimated_duration_minutes:
            body.estimated_duration_minutes != null ? Number(body.estimated_duration_minutes) : null,
        instructions: body.notes ? String(body.notes) : null,
        priority: body.priority ? String(body.priority) : "medium",
        default_assignee_id: body.assigned_to ? String(body.assigned_to) : null,
        next_due_date: toIso(body.next_due_date) || new Date().toISOString(),
        created_by: createdBy,
        is_active: true,
    };

    const { data: plan, error } = await supabase
        .from("maintenance_plans")
        .insert(payload as any)
        .select("*")
        .single();

    if (error) throw error;

    return getLegacyScheduleById(supabase, plan.id, organizationId, false);
}

export async function updateLegacySchedule(
    supabase: SupabaseClient,
    id: string,
    organizationId: string | null,
    isPlatformAdmin: boolean,
    body: Record<string, any>
) {
    const existing = await getLegacyScheduleById(supabase, id, organizationId, isPlatformAdmin);
    if (!existing) {
        return null;
    }

    const updateData: Record<string, any> = {};

    if (body.title !== undefined) updateData.title = body.title ? String(body.title) : null;
    if (body.description !== undefined) updateData.description = body.description ? String(body.description) : null;
    if (body.frequency !== undefined) {
        updateData.frequency_type = body.frequency ? String(body.frequency) : "monthly";
        updateData.frequency_value = mapFrequencyValue(body.frequency);
    }
    if (body.next_due_date !== undefined) updateData.next_due_date = toIso(body.next_due_date);
    if (body.assigned_to !== undefined) updateData.default_assignee_id = body.assigned_to ? String(body.assigned_to) : null;
    if (body.priority !== undefined) updateData.priority = body.priority ? String(body.priority) : "medium";
    if (body.estimated_duration_minutes !== undefined) {
        updateData.estimated_duration_minutes =
            body.estimated_duration_minutes != null ? Number(body.estimated_duration_minutes) : null;
    }
    if (body.notes !== undefined) updateData.instructions = body.notes ? String(body.notes) : null;
    if (body.status !== undefined) {
        updateData.is_active = body.status !== "inactive" && body.status !== "cancelled";
    }

    const { error } = await supabase
        .from("maintenance_plans")
        .update(updateData)
        .eq("id", id);

    if (error) throw error;

    return getLegacyScheduleById(supabase, id, organizationId, isPlatformAdmin);
}

export async function deactivateLegacySchedule(
    supabase: SupabaseClient,
    id: string,
    organizationId: string | null,
    isPlatformAdmin: boolean
) {
    const existing = await getLegacyScheduleById(supabase, id, organizationId, isPlatformAdmin);
    if (!existing) {
        return null;
    }

    const { error } = await supabase
        .from("maintenance_plans")
        .update({ is_active: false })
        .eq("id", id);

    if (error) throw error;
    return true;
}

export async function completeLegacySchedule(
    supabase: SupabaseClient,
    id: string,
    organizationId: string | null,
    isPlatformAdmin: boolean,
    userId: string,
    body: Record<string, any>
) {
    const { data: plan, error } = await supabase
        .from("maintenance_plans")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) throw error;
    if (!plan) return null;
    if (!isPlatformAdmin && organizationId && plan.organization_id !== organizationId) {
        return null;
    }

    const machineId = plan.machine_id;
    if (!machineId) {
        throw new Error("Maintenance plan has no machine_id");
    }

    const { data: machine, error: machineError } = await supabase
        .from("machines")
        .select("id, plant_id, organization_id")
        .eq("id", machineId)
        .maybeSingle();

    if (machineError) throw machineError;
    if (!machine) {
        throw new Error("Machine not found");
    }

    const completedAt = new Date();
    const nextDueDate = calculateNextDueDate(
        plan.frequency_type,
        plan.frequency_value,
        completedAt
    ).toISOString();

    const workOrderInsert = {
        organization_id: plan.organization_id,
        machine_id: machine.id,
        plant_id: machine.plant_id ?? null,
        maintenance_plan_id: plan.id,
        title: plan.title,
        description: plan.description,
        work_type: "preventive",
        priority: plan.priority ?? "medium",
        status: "completed",
        scheduled_date: plan.next_due_date ?? null,
        completed_at: completedAt.toISOString(),
        completed_by: userId,
        created_by: userId,
        updated_at: completedAt.toISOString(),
        actual_duration_minutes:
            body.duration_minutes != null ? Number(body.duration_minutes) : null,
        work_performed: body.notes ? String(body.notes) : null,
        findings: body.notes ? String(body.notes) : null,
        notes: body.notes ? String(body.notes) : null,
        spare_parts_used: body.parts_used ?? null,
        total_cost: body.cost != null ? Number(body.cost) : null,
    };

    const { data: log, error: workOrderError } = await supabase
        .from("work_orders")
        .insert(workOrderInsert as any)
        .select("*")
        .single();

    if (workOrderError) throw workOrderError;

    const { error: updateError } = await supabase
        .from("maintenance_plans")
        .update({
            last_executed_at: completedAt.toISOString(),
            next_due_date: nextDueDate,
            is_active: true,
        })
        .eq("id", plan.id);

    if (updateError) throw updateError;

    const schedule = await getLegacyScheduleById(supabase, plan.id, organizationId, isPlatformAdmin);
    return {
        schedule,
        log,
        next_due_date: nextDueDate,
    };
}

