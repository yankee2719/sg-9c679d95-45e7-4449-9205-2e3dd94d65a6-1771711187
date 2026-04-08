import type { SupabaseClient } from "@supabase/supabase-js";

export type LegacyScheduleStatus = "scheduled" | "overdue" | "inactive";

interface AppUserLike {
    userId: string;
    organizationId: string | null;
    role: string;
}

interface LegacyScheduleQuery {
    equipment_id?: string | string[];
    status?: string | string[];
    frequency?: string | string[];
    assigned_to?: string | string[];
    upcoming_days?: string | string[];
    overdue?: string | string[];
    sort?: string | string[];
    order?: string | string[];
    page?: string | string[];
    limit?: string | string[];
}

function readString(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
}

function buildProfileDisplayName(profile: any): string | null {
    if (!profile) return null;
    return profile.display_name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || null;
}

function inferLegacyFrequency(frequencyType: string | null | undefined, frequencyValue: number | null | undefined): string {
    const type = (frequencyType || "monthly").toLowerCase();
    const value = Number.isFinite(Number(frequencyValue)) ? Number(frequencyValue) : 1;

    if (type === "weekly" && value === 2) return "biweekly";
    if (type === "monthly" && value === 3) return "quarterly";
    if (type === "yearly") return "yearly";
    if (type === "daily") return "daily";
    if (type === "weekly") return "weekly";
    if (type === "monthly") return "monthly";

    return value > 1 ? `${type}:${value}` : type;
}

export function parseLegacyFrequency(input: unknown): { frequency_type: string; frequency_value: number } {
    const raw = `${input ?? ""}`.trim().toLowerCase();

    if (!raw) return { frequency_type: "monthly", frequency_value: 1 };
    if (raw === "daily") return { frequency_type: "daily", frequency_value: 1 };
    if (raw === "weekly") return { frequency_type: "weekly", frequency_value: 1 };
    if (raw === "biweekly") return { frequency_type: "weekly", frequency_value: 2 };
    if (raw === "monthly") return { frequency_type: "monthly", frequency_value: 1 };
    if (raw === "quarterly") return { frequency_type: "monthly", frequency_value: 3 };
    if (raw === "yearly" || raw === "annual") return { frequency_type: "yearly", frequency_value: 1 };

    const [typePart, valuePart] = raw.split(":");
    const parsedValue = Number.parseInt(valuePart || "1", 10);
    return {
        frequency_type: typePart || "monthly",
        frequency_value: Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1,
    };
}

export function calculateNextDueDate(frequencyType: string, frequencyValue: number, fromDate = new Date()): string {
    const next = new Date(fromDate);
    const safeValue = Number.isFinite(Number(frequencyValue)) && Number(frequencyValue) > 0 ? Number(frequencyValue) : 1;

    switch ((frequencyType || "monthly").toLowerCase()) {
        case "daily":
            next.setDate(next.getDate() + safeValue);
            break;
        case "weekly":
            next.setDate(next.getDate() + safeValue * 7);
            break;
        case "yearly":
            next.setFullYear(next.getFullYear() + safeValue);
            break;
        case "monthly":
        default:
            next.setMonth(next.getMonth() + safeValue);
            break;
    }

    return next.toISOString();
}

function inferStatus(plan: any): LegacyScheduleStatus {
    if (plan?.is_active === false) return "inactive";
    if (plan?.next_due_date) {
        const dueTs = new Date(plan.next_due_date).getTime();
        if (!Number.isNaN(dueTs) && dueTs < Date.now()) {
            return "overdue";
        }
    }
    return "scheduled";
}

async function fetchMachineMap(supabase: SupabaseClient, machineIds: string[]) {
    const uniqueMachineIds = Array.from(new Set(machineIds.filter(Boolean)));
    if (uniqueMachineIds.length === 0) return new Map < string, any > ();

    const { data, error } = await supabase
        .from("machines")
        .select("id, name, internal_code, area, category, organization_id, plant_id")
        .in("id", uniqueMachineIds);

    if (error) throw error;
    return new Map((data ?? []).map((row: any) => [row.id, row]));
}

async function fetchProfileMap(supabase: SupabaseClient, profileIds: string[]) {
    const uniqueProfileIds = Array.from(new Set(profileIds.filter(Boolean)));
    if (uniqueProfileIds.length === 0) return new Map < string, any > ();

    const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name, email")
        .in("id", uniqueProfileIds);

    if (error) throw error;
    return new Map((data ?? []).map((row: any) => [row.id, row]));
}

async function fetchChecklistMaps(supabase: SupabaseClient, planIds: string[]) {
    const uniquePlanIds = Array.from(new Set(planIds.filter(Boolean)));
    const byPlanId = new Map < string, string | null > ();
    const templateMap = new Map < string, any> ();

    if (uniquePlanIds.length === 0) {
        return { byPlanId, templateMap };
    }

    const { data: rows, error } = await supabase
        .from("maintenance_plan_checklists")
        .select("plan_id, template_id, execution_order")
        .in("plan_id", uniquePlanIds)
        .order("execution_order", { ascending: true });

    if (error) throw error;

    const templateIds: string[] = [];
    for (const row of rows ?? []) {
        if (!byPlanId.has((row as any).plan_id)) {
            byPlanId.set((row as any).plan_id, (row as any).template_id ?? null);
        }
        if ((row as any).template_id) {
            templateIds.push((row as any).template_id);
        }
    }

    const uniqueTemplateIds = Array.from(new Set(templateIds));
    if (uniqueTemplateIds.length > 0) {
        const { data: templates, error: templateError } = await supabase
            .from("checklist_templates")
            .select("id, name, description")
            .in("id", uniqueTemplateIds);

        if (templateError) throw templateError;
        for (const template of templates ?? []) {
            templateMap.set((template as any).id, template);
        }
    }

    return { byPlanId, templateMap };
}

export async function getAccessiblePlan(
    supabase: SupabaseClient,
    user: AppUserLike,
    planId: string
) {
    const { data, error } = await supabase
        .from("maintenance_plans")
        .select("*")
        .eq("id", planId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    if (user.organizationId && (data as any).organization_id !== user.organizationId) return null;
    return data as any;
}

export async function serializePlanAsLegacySchedule(
    supabase: SupabaseClient,
    plan: any,
    options?: { includeRecentLogs?: boolean }
) {
    const machineMap = await fetchMachineMap(supabase, [plan.machine_id].filter(Boolean));
    const profileMap = await fetchProfileMap(supabase, [plan.default_assignee_id, plan.created_by].filter(Boolean));
    const { byPlanId, templateMap } = await fetchChecklistMaps(supabase, [plan.id]);

    const machine = plan.machine_id ? machineMap.get(plan.machine_id) ?? null : null;
    const assignee = plan.default_assignee_id ? profileMap.get(plan.default_assignee_id) ?? null : null;
    const checklistId = byPlanId.get(plan.id) ?? null;
    const checklist = checklistId ? templateMap.get(checklistId) ?? null : null;

    let recentLogs: any[] = [];
    if (options?.includeRecentLogs) {
        const { data: logs, error: logsError } = await supabase
            .from("work_orders")
            .select("id, assigned_to, completed_by, completed_at, actual_duration_minutes, notes, findings, work_performed, status, created_at")
            .eq("maintenance_plan_id", plan.id)
            .order("completed_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(10);

        if (logsError) throw logsError;

        const performerMap = await fetchProfileMap(
            supabase,
            Array.from(new Set((logs ?? []).map((row: any) => row.completed_by || row.assigned_to).filter(Boolean)))
        );

        recentLogs = (logs ?? []).map((log: any) => {
            const performer = performerMap.get(log.completed_by || log.assigned_to) ?? null;
            return {
                id: log.id,
                schedule_id: plan.id,
                equipment_id: plan.machine_id,
                performed_by: log.completed_by || log.assigned_to || null,
                completed_at: log.completed_at || log.created_at,
                notes: log.notes || log.findings || log.work_performed || null,
                duration_minutes: log.actual_duration_minutes ?? null,
                checklist_execution_id: null,
                parts_used: null,
                cost: null,
                status: log.status,
                performed_by_user: performer
                    ? {
                        id: performer.id,
                        full_name: buildProfileDisplayName(performer),
                        email: performer.email ?? null,
                    }
                    : null,
            };
        });
    }

    return {
        id: plan.id,
        equipment_id: plan.machine_id,
        title: plan.title,
        description: plan.description,
        frequency: inferLegacyFrequency(plan.frequency_type, plan.frequency_value),
        next_due_date: plan.next_due_date,
        assigned_to: plan.default_assignee_id,
        checklist_id: checklistId,
        priority: plan.priority,
        estimated_duration_minutes: plan.estimated_duration_minutes,
        notes: plan.safety_notes || plan.instructions || null,
        status: inferStatus(plan),
        last_completed: plan.last_executed_at,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
        frequency_type: plan.frequency_type,
        frequency_value: plan.frequency_value,
        is_active: plan.is_active,
        equipment: machine
            ? {
                id: machine.id,
                name: machine.name,
                equipment_code: machine.internal_code,
                location: machine.area,
                category: machine.category,
                organization_id: machine.organization_id,
                plant_id: machine.plant_id,
            }
            : null,
        assigned_user: assignee
            ? {
                id: assignee.id,
                full_name: buildProfileDisplayName(assignee),
                email: assignee.email ?? null,
            }
            : null,
        checklist: checklist
            ? {
                id: checklist.id,
                name: checklist.name,
                description: checklist.description ?? null,
            }
            : null,
        recent_logs: recentLogs,
    };
}

export async function listLegacySchedules(
    supabase: SupabaseClient,
    user: AppUserLike,
    query: LegacyScheduleQuery
) {
    if (!user.organizationId) {
        return {
            rows: [],
            total: 0,
            page: 1,
            limit: 20,
        };
    }

    const page = Math.max(1, Number.parseInt(readString(query.page) || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(readString(query.limit) || "20", 10) || 20));

    let dbQuery = supabase
        .from("maintenance_plans")
        .select("*", { count: "exact" })
        .eq("organization_id", user.organizationId);

    const equipmentId = readString(query.equipment_id);
    if (equipmentId) dbQuery = dbQuery.eq("machine_id", equipmentId);

    const assignedTo = readString(query.assigned_to);
    if (assignedTo) dbQuery = dbQuery.eq("default_assignee_id", assignedTo);

    const frequency = readString(query.frequency);
    if (frequency) {
        const normalized = parseLegacyFrequency(frequency);
        dbQuery = dbQuery
            .eq("frequency_type", normalized.frequency_type)
            .eq("frequency_value", normalized.frequency_value);
    }

    dbQuery = dbQuery.order("next_due_date", { ascending: true, nullsFirst: false });

    const { data, error, count } = await dbQuery;
    if (error) throw error;

    let plans = (data ?? []) as any[];

    const requestedStatus = readString(query.status);
    if (requestedStatus) {
        plans = plans.filter((plan) => inferStatus(plan) === requestedStatus);
    }

    if (readString(query.overdue) === "true") {
        plans = plans.filter((plan) => inferStatus(plan) === "overdue");
    }

    const upcomingDaysRaw = readString(query.upcoming_days);
    if (upcomingDaysRaw) {
        const days = Number.parseInt(upcomingDaysRaw, 10);
        if (Number.isFinite(days) && days > 0) {
            const now = Date.now();
            const future = now + days * 24 * 60 * 60 * 1000;
            plans = plans.filter((plan) => {
                if (!plan.next_due_date) return false;
                const due = new Date(plan.next_due_date).getTime();
                return !Number.isNaN(due) && due >= now && due <= future;
            });
        }
    }

    const sort = readString(query.sort) || "next_due_date";
    const order = (readString(query.order) || "asc").toLowerCase() === "desc" ? "desc" : "asc";
    const sortFactor = order === "asc" ? 1 : -1;

    plans.sort((a, b) => {
        const valueA = a?.[sort] ?? null;
        const valueB = b?.[sort] ?? null;

        if (valueA === valueB) return 0;
        if (valueA === null) return 1;
        if (valueB === null) return -1;

        if (sort.includes("date") || sort.endsWith("_at")) {
            return (new Date(valueA).getTime() - new Date(valueB).getTime()) * sortFactor;
        }

        if (typeof valueA === "number" && typeof valueB === "number") {
            return (valueA - valueB) * sortFactor;
        }

        return String(valueA).localeCompare(String(valueB)) * sortFactor;
    });

    const total = plans.length;
    const start = (page - 1) * limit;
    const paged = plans.slice(start, start + limit);

    const machineMap = await fetchMachineMap(supabase, paged.map((plan) => plan.machine_id).filter(Boolean));
    const profileMap = await fetchProfileMap(supabase, paged.map((plan) => plan.default_assignee_id).filter(Boolean));
    const { byPlanId } = await fetchChecklistMaps(supabase, paged.map((plan) => plan.id));

    const rows = paged.map((plan) => {
        const machine = plan.machine_id ? machineMap.get(plan.machine_id) ?? null : null;
        const assignee = plan.default_assignee_id ? profileMap.get(plan.default_assignee_id) ?? null : null;

        return {
            id: plan.id,
            equipment_id: plan.machine_id,
            title: plan.title,
            description: plan.description,
            frequency: inferLegacyFrequency(plan.frequency_type, plan.frequency_value),
            next_due_date: plan.next_due_date,
            assigned_to: plan.default_assignee_id,
            checklist_id: byPlanId.get(plan.id) ?? null,
            priority: plan.priority,
            estimated_duration_minutes: plan.estimated_duration_minutes,
            notes: plan.safety_notes || plan.instructions || null,
            status: inferStatus(plan),
            last_completed: plan.last_executed_at,
            created_at: plan.created_at,
            updated_at: plan.updated_at,
            equipment: machine
                ? {
                    id: machine.id,
                    name: machine.name,
                    equipment_code: machine.internal_code,
                    location: machine.area,
                    category: machine.category,
                    organization_id: machine.organization_id,
                }
                : null,
            assigned_user: assignee
                ? {
                    id: assignee.id,
                    full_name: buildProfileDisplayName(assignee),
                    email: assignee.email ?? null,
                }
                : null,
        };
    });

    return { rows, total: count ?? total, page, limit };
}

export async function assertCanReferenceMachine(
    supabase: SupabaseClient,
    user: AppUserLike,
    machineId: string
) {
    const { data, error } = await supabase
        .from("machines")
        .select("id, organization_id, plant_id, name")
        .eq("id", machineId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    if (user.organizationId && (data as any).organization_id !== user.organizationId) return null;
    return data as any;
}

export async function upsertSinglePlanChecklist(
    supabase: SupabaseClient,
    planId: string,
    organizationId: string,
    checklistId: string | null | undefined
) {
    const normalized = typeof checklistId === "string" && checklistId.trim() ? checklistId.trim() : null;

    const { error: deleteError } = await supabase
        .from("maintenance_plan_checklists")
        .delete()
        .eq("plan_id", planId);

    if (deleteError) throw deleteError;

    if (!normalized) return;

    const { data: template, error: templateError } = await supabase
        .from("checklist_templates")
        .select("id, organization_id")
        .eq("id", normalized)
        .maybeSingle();

    if (templateError) throw templateError;
    if (!template) {
        throw new Error("Checklist template not found.");
    }
    if ((template as any).organization_id !== organizationId) {
        throw new Error("Checklist template belongs to another organization.");
    }

    const { error: insertError } = await supabase
        .from("maintenance_plan_checklists")
        .insert({
            plan_id: planId,
            template_id: normalized,
            execution_order: 1,
            is_required: true,
        } as any);

    if (insertError) throw insertError;
}

