import { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "@/lib/apiAuth";

type ApiUser = AuthenticatedRequest["user"];

type ChecklistStatus = "pending" | "passed" | "failed" | "partial";

export interface ChecklistExecutionItemInput {
    template_item_id: string;
    value?: string | null;
    notes?: string | null;
    photos?: string[];
}

export interface ChecklistExecutionSummary {
    id: string;
    assignment_id: string | null;
    organization_id: string;
    work_order_id: string | null;
    machine_id: string | null;
    executed_by: string;
    executed_at: string;
    completed_at: string | null;
    overall_status: string | null;
    notes: string | null;
    template_version: number;
    template_name: string | null;
    machine_name: string | null;
    machine_code: string | null;
    plant_id: string | null;
    plant_name: string | null;
    work_order_title: string | null;
    executed_by_name: string | null;
}

interface ExecutionRow {
    id: string;
    assignment_id: string;
    organization_id: string;
    work_order_id: string | null;
    machine_id: string | null;
    executed_by: string;
    executed_at: string;
    completed_at: string | null;
    overall_status: ChecklistStatus | null;
    notes: string | null;
    template_version: number;
    checklist_id?: string | null;
}

async function canAccessMachineOrOrg(
    supabase: SupabaseClient,
    user: ApiUser,
    organizationId: string,
    machineId?: string | null
): Promise<boolean> {
    if (!user.organizationId) return false;
    if (organizationId === user.organizationId) return true;
    if (!machineId) return false;

    const { data, error } = await supabase
        .from("machine_assignments")
        .select("id")
        .eq("machine_id", machineId)
        .eq("is_active", true)
        .or(
            `manufacturer_org_id.eq.${user.organizationId},customer_org_id.eq.${user.organizationId}`
        )
        .limit(1)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return !!data;
}

async function getProfileSummary(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name, email")
        .eq("id", userId)
        .maybeSingle();

    if (error) throw error;

    const displayName =
        (data as any)?.display_name ||
        [
            (data as any)?.first_name,
            (data as any)?.last_name,
        ]
            .filter(Boolean)
            .join(" ") ||
        (data as any)?.email ||
        null;

    return {
        id: userId,
        display_name: displayName,
        email: (data as any)?.email ?? null,
    };
}

function inferOverallStatus(items: ChecklistExecutionItemInput[]): ChecklistStatus {
    if (items.length === 0) return "partial";

    let hasFalse = false;
    let hasBlank = false;

    for (const item of items) {
        const rawValue = (item.value ?? "").toString().trim().toLowerCase();
        if (!rawValue) {
            hasBlank = true;
            continue;
        }
        if (rawValue === "false" || rawValue === "ko" || rawValue === "no") {
            hasFalse = true;
        }
    }

    if (hasFalse) return "failed";
    if (hasBlank) return "partial";
    return "passed";
}

export async function createExecutionFromAssignment(
    supabase: SupabaseClient,
    user: ApiUser,
    params: { assignmentId: string; workOrderId?: string | null }
) {
    const { data: assignment, error: assignmentError } = await supabase
        .from("checklist_assignments")
        .select(
            `
      id,
      organization_id,
      machine_id,
      template_id,
      checklist_templates:template_id (id, name, version)
    `
        )
        .eq("id", params.assignmentId)
        .maybeSingle();

    if (assignmentError) throw assignmentError;
    if (!assignment) {
        throw new Error("Checklist assignment not found.");
    }

    const allowed = await canAccessMachineOrOrg(
        supabase,
        user,
        (assignment as any).organization_id,
        (assignment as any).machine_id ?? null
    );
    if (!allowed) {
        throw new Error("You cannot execute this checklist in the active organization context.");
    }

    const { data: existing } = await supabase
        .from("checklist_executions")
        .select("id")
        .eq("assignment_id", params.assignmentId)
        .is("completed_at", null)
        .order("executed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existing?.id) {
        return { id: existing.id };
    }

    let workOrderId: string | null = params.workOrderId ?? null;
    if (workOrderId) {
        const { data: workOrder, error: workOrderError } = await supabase
            .from("work_orders")
            .select("id, organization_id, machine_id")
            .eq("id", workOrderId)
            .maybeSingle();

        if (workOrderError) throw workOrderError;
        if (!workOrder) {
            throw new Error("Work order not found.");
        }
        if (
            (workOrder as any).organization_id !== (assignment as any).organization_id ||
            ((workOrder as any).machine_id ?? null) !== ((assignment as any).machine_id ?? null)
        ) {
            throw new Error("Work order and checklist assignment do not belong to the same machine context.");
        }
    }

    const templateVersion = Number((assignment as any)?.checklist_templates?.version ?? 1);

    const { data: inserted, error: insertError } = await supabase
        .from("checklist_executions")
        .insert({
            assignment_id: params.assignmentId,
            organization_id: (assignment as any).organization_id,
            machine_id: (assignment as any).machine_id ?? null,
            work_order_id: workOrderId,
            executed_by: user.id,
            executed_at: new Date().toISOString(),
            overall_status: "pending",
            template_version: templateVersion,
            checklist_id: null,
            notes: null,
        } as any)
        .select("id")
        .single();

    if (insertError) throw insertError;
    return { id: (inserted as any).id as string };
}

export async function listExecutions(supabase: SupabaseClient, user: ApiUser) {
    if (!user.organizationId) {
        throw new Error("Active organization not found.");
    }

    const { data: linkedAssignments, error: linkedAssignmentsError } = await supabase
        .from("machine_assignments")
        .select("machine_id")
        .eq("is_active", true)
        .or(
            `manufacturer_org_id.eq.${user.organizationId},customer_org_id.eq.${user.organizationId}`
        );

    if (linkedAssignmentsError) throw linkedAssignmentsError;

    const linkedMachineIds = Array.from(
        new Set(
            (linkedAssignments ?? [])
                .map((row: any) => row.machine_id)
                .filter(Boolean)
        )
    ) as string[];

    let executionRows: ExecutionRow[] = [];

    const { data: orgRows, error: orgRowsError } = await supabase
        .from("checklist_executions")
        .select(
            "id, assignment_id, organization_id, work_order_id, machine_id, executed_by, executed_at, completed_at, overall_status, notes, template_version, checklist_id"
        )
        .eq("organization_id", user.organizationId)
        .order("executed_at", { ascending: false });

    if (orgRowsError) throw orgRowsError;
    executionRows = [...((orgRows ?? []) as ExecutionRow[])];

    if (linkedMachineIds.length > 0) {
        const { data: linkedRows, error: linkedRowsError } = await supabase
            .from("checklist_executions")
            .select(
                "id, assignment_id, organization_id, work_order_id, machine_id, executed_by, executed_at, completed_at, overall_status, notes, template_version, checklist_id"
            )
            .in("machine_id", linkedMachineIds)
            .order("executed_at", { ascending: false });

        if (linkedRowsError) throw linkedRowsError;

        const seen = new Set(executionRows.map((row) => row.id));
        for (const row of (linkedRows ?? []) as ExecutionRow[]) {
            if (!seen.has(row.id)) {
                seen.add(row.id);
                executionRows.push(row);
            }
        }
    }

    executionRows.sort(
        (a, b) =>
            new Date(b.executed_at ?? b.completed_at ?? 0).getTime() -
            new Date(a.executed_at ?? a.completed_at ?? 0).getTime()
    );

    const assignmentIds = Array.from(
        new Set(executionRows.map((row) => row.assignment_id).filter(Boolean))
    ) as string[];
    const machineIds = Array.from(
        new Set(executionRows.map((row) => row.machine_id).filter(Boolean))
    ) as string[];
    const workOrderIds = Array.from(
        new Set(executionRows.map((row) => row.work_order_id).filter(Boolean))
    ) as string[];
    const userIds = Array.from(
        new Set(executionRows.map((row) => row.executed_by).filter(Boolean))
    ) as string[];

    const assignmentMap = new Map < string, any> ();
    const templateMap = new Map < string, any> ();
    const machineMap = new Map < string, any> ();
    const plantMap = new Map < string, any> ();
    const workOrderMap = new Map < string, any> ();
    const profileMap = new Map < string, string | null > ();

    if (assignmentIds.length > 0) {
        const { data: assignments, error: assignmentsError } = await supabase
            .from("checklist_assignments")
            .select("id, template_id, machine_id")
            .in("id", assignmentIds);
        if (assignmentsError) throw assignmentsError;
        for (const row of assignments ?? []) assignmentMap.set((row as any).id, row);

        const templateIds = Array.from(
            new Set((assignments ?? []).map((row: any) => row.template_id).filter(Boolean))
        );
        if (templateIds.length > 0) {
            const { data: templates, error: templatesError } = await supabase
                .from("checklist_templates")
                .select("id, name")
                .in("id", templateIds as string[]);
            if (templatesError) throw templatesError;
            for (const row of templates ?? []) templateMap.set((row as any).id, row);
        }
    }

    if (machineIds.length > 0) {
        const { data: machines, error: machinesError } = await supabase
            .from("machines")
            .select("id, name, internal_code, plant_id")
            .in("id", machineIds);
        if (machinesError) throw machinesError;
        for (const row of machines ?? []) machineMap.set((row as any).id, row);

        const plantIds = Array.from(
            new Set((machines ?? []).map((row: any) => row.plant_id).filter(Boolean))
        ) as string[];
        if (plantIds.length > 0) {
            const { data: plants, error: plantsError } = await supabase
                .from("plants")
                .select("id, name")
                .in("id", plantIds);
            if (plantsError) throw plantsError;
            for (const row of plants ?? []) plantMap.set((row as any).id, row);
        }
    }

    if (workOrderIds.length > 0) {
        const { data: workOrders, error: workOrdersError } = await supabase
            .from("work_orders")
            .select("id, title")
            .in("id", workOrderIds);
        if (workOrdersError) throw workOrdersError;
        for (const row of workOrders ?? []) workOrderMap.set((row as any).id, row);
    }

    if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, display_name, first_name, last_name, email")
            .in("id", userIds);
        if (profilesError) throw profilesError;
        for (const row of profiles ?? []) {
            const displayName =
                (row as any).display_name ||
                [(row as any).first_name, (row as any).last_name].filter(Boolean).join(" ") ||
                (row as any).email ||
                null;
            profileMap.set((row as any).id, displayName);
        }
    }

    const summaries: ChecklistExecutionSummary[] = executionRows.map((row) => {
        const assignment = row.assignment_id ? assignmentMap.get(row.assignment_id) : null;
        const template = assignment?.template_id ? templateMap.get(assignment.template_id) : null;
        const machine = row.machine_id ? machineMap.get(row.machine_id) : null;
        const plant = machine?.plant_id ? plantMap.get(machine.plant_id) : null;
        const workOrder = row.work_order_id ? workOrderMap.get(row.work_order_id) : null;

        return {
            id: row.id,
            assignment_id: row.assignment_id,
            organization_id: row.organization_id,
            work_order_id: row.work_order_id,
            machine_id: row.machine_id,
            executed_by: row.executed_by,
            executed_at: row.executed_at,
            completed_at: row.completed_at,
            overall_status: row.overall_status,
            notes: row.notes,
            template_version: row.template_version,
            template_name: template?.name ?? null,
            machine_name: machine?.name ?? null,
            machine_code: machine?.internal_code ?? null,
            plant_id: machine?.plant_id ?? null,
            plant_name: plant?.name ?? null,
            work_order_title: workOrder?.title ?? null,
            executed_by_name: profileMap.get(row.executed_by) ?? null,
        };
    });

    return summaries;
}

export async function getExecutionDetail(
    supabase: SupabaseClient,
    user: ApiUser,
    executionId: string
) {
    const { data: execution, error: executionError } = await supabase
        .from("checklist_executions")
        .select(
            "id, assignment_id, organization_id, work_order_id, machine_id, executed_by, executed_at, completed_at, overall_status, notes, template_version, checklist_id"
        )
        .eq("id", executionId)
        .maybeSingle();

    if (executionError) throw executionError;
    if (!execution) throw new Error("Checklist execution not found.");

    const canAccess = await canAccessMachineOrOrg(
        supabase,
        user,
        (execution as any).organization_id,
        (execution as any).machine_id ?? null
    );
    if (!canAccess) {
        throw new Error("Checklist execution not accessible in the active organization context.");
    }

    const executionRow = execution as ExecutionRow;
    const profile = await getProfileSummary(supabase, executionRow.executed_by);

    let assignment: any = null;
    let template: any = null;
    let templateItems: any[] = [];

    if (executionRow.assignment_id) {
        const { data: assignmentRow, error: assignmentError } = await supabase
            .from("checklist_assignments")
            .select(
                `
        id,
        template_id,
        machine_id,
        production_line_id,
        checklist_templates:template_id (id, name, description, version, target_type)
      `
            )
            .eq("id", executionRow.assignment_id)
            .maybeSingle();

        if (assignmentError) throw assignmentError;
        assignment = assignmentRow;
        template = (assignmentRow as any)?.checklist_templates ?? null;

        if ((assignmentRow as any)?.template_id) {
            const { data: rows, error: itemsError } = await supabase
                .from("checklist_template_items")
                .select("id, title, description, input_type, is_required, order_index, metadata")
                .eq("template_id", (assignmentRow as any).template_id)
                .order("order_index", { ascending: true });
            if (itemsError) throw itemsError;
            templateItems = (rows ?? []) as any[];
        }
    } else if (executionRow.checklist_id) {
        const { data: checklistRow, error: checklistError } = await supabase
            .from("checklists")
            .select("id, title, description")
            .eq("id", executionRow.checklist_id)
            .maybeSingle();
        if (checklistError) throw checklistError;

        template = checklistRow
            ? {
                id: (checklistRow as any).id,
                name: (checklistRow as any).title,
                description: (checklistRow as any).description,
                version: executionRow.template_version ?? 1,
                target_type: "machine",
            }
            : null;

        const { data: rows, error: legacyItemsError } = await supabase
            .from("checklist_items")
            .select("id, title, description, is_required, item_order")
            .eq("checklist_id", executionRow.checklist_id)
            .order("item_order", { ascending: true });
        if (legacyItemsError) throw legacyItemsError;

        templateItems = (rows ?? []).map((row: any, index: number) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            input_type: "boolean",
            is_required: Boolean(row.is_required),
            order_index: row.item_order ?? index,
            metadata: {},
        }));
    }

    const { data: itemRows, error: itemRowsError } = await supabase
        .from("checklist_execution_items")
        .select("id, template_item_id, value, notes")
        .eq("execution_id", executionId);
    if (itemRowsError) throw itemRowsError;

    const itemIdMap = new Map < string, string> ();
    for (const row of itemRows ?? []) {
        itemIdMap.set((row as any).id, (row as any).template_item_id);
    }

    const answerIds = Array.from(itemIdMap.keys());
    const photosByTemplateItemId = new Map < string, string[]> ();
    if (answerIds.length > 0) {
        const { data: photos, error: photosError } = await supabase
            .from("checklist_execution_photos")
            .select("execution_item_id, storage_path")
            .in("execution_item_id", answerIds);
        if (photosError) throw photosError;

        for (const row of photos ?? []) {
            const templateItemId = itemIdMap.get((row as any).execution_item_id);
            if (!templateItemId) continue;
            const current = photosByTemplateItemId.get(templateItemId) ?? [];
            current.push((row as any).storage_path);
            photosByTemplateItemId.set(templateItemId, current);
        }
    }

    const answerMap = new Map < string, any> ();
    for (const row of itemRows ?? []) {
        answerMap.set((row as any).template_item_id, {
            id: (row as any).id,
            template_item_id: (row as any).template_item_id,
            value: (row as any).value ?? null,
            notes: (row as any).notes ?? null,
            photos: photosByTemplateItemId.get((row as any).template_item_id) ?? [],
        });
    }

    const machine = executionRow.machine_id
        ? await supabase
            .from("machines")
            .select("id, name, internal_code, plant_id")
            .eq("id", executionRow.machine_id)
            .maybeSingle()
        : { data: null, error: null };
    if (machine.error) throw machine.error;

    const workOrder = executionRow.work_order_id
        ? await supabase
            .from("work_orders")
            .select("id, title, status, assigned_to")
            .eq("id", executionRow.work_order_id)
            .maybeSingle()
        : { data: null, error: null };
    if (workOrder.error) throw workOrder.error;

    return {
        execution: executionRow,
        assignment,
        template,
        items: templateItems.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description ?? null,
            input_type: item.input_type ?? "boolean",
            is_required: Boolean(item.is_required),
            order_index: item.order_index ?? 0,
            metadata: item.metadata ?? {},
            answer: answerMap.get(item.id) ?? null,
        })),
        machine: machine.data ?? null,
        workOrder: workOrder.data ?? null,
        technician: profile,
    };
}

export async function completeExecution(
    supabase: SupabaseClient,
    user: ApiUser,
    executionId: string,
    params: {
        items: ChecklistExecutionItemInput[];
        notes?: string | null;
        overall_status?: ChecklistStatus | null;
    }
) {
    const detail = await getExecutionDetail(supabase, user, executionId);

    if (
        user.role === "technician" &&
        detail.execution.executed_by !== user.id &&
        (detail.workOrder as any)?.assigned_to !== user.id
    ) {
        throw new Error("Technicians can only complete their own or assigned checklist executions.");
    }

    const previousItems = detail.items
        .map((item: any) => item.answer?.id)
        .filter(Boolean) as string[];

    if (previousItems.length > 0) {
        const { error: photoDeleteError } = await supabase
            .from("checklist_execution_photos")
            .delete()
            .in("execution_item_id", previousItems);
        if (photoDeleteError) throw photoDeleteError;

        const { error: itemDeleteError } = await supabase
            .from("checklist_execution_items")
            .delete()
            .eq("execution_id", executionId);
        if (itemDeleteError) throw itemDeleteError;
    }

    const cleanedItems = params.items.map((item) => ({
        template_item_id: item.template_item_id,
        value:
            item.value === undefined || item.value === null || `${item.value}`.trim() === ""
                ? null
                : `${item.value}`,
        notes:
            item.notes === undefined || item.notes === null || `${item.notes}`.trim() === ""
                ? null
                : `${item.notes}`,
        photos: (item.photos ?? []).filter(Boolean),
    }));

    let insertedRows: Array<{ id: string; template_item_id: string }> = [];
    if (cleanedItems.length > 0) {
        const { data: rows, error: insertItemsError } = await supabase
            .from("checklist_execution_items")
            .insert(
                cleanedItems.map((item) => ({
                    execution_id: executionId,
                    template_item_id: item.template_item_id,
                    value: item.value,
                    notes: item.notes,
                })) as any
            )
            .select("id, template_item_id");
        if (insertItemsError) throw insertItemsError;
        insertedRows = (rows ?? []) as Array<{ id: string; template_item_id: string }>;
    }

    const photosPayload: Array<{ execution_item_id: string; storage_path: string }> = [];
    for (const row of insertedRows) {
        const input = cleanedItems.find((item) => item.template_item_id === row.template_item_id);
        if (!input) continue;
        for (const path of input.photos) {
            photosPayload.push({ execution_item_id: row.id, storage_path: path });
        }
    }

    if (photosPayload.length > 0) {
        const { error: photosInsertError } = await supabase
            .from("checklist_execution_photos")
            .insert(photosPayload as any);
        if (photosInsertError) throw photosInsertError;
    }

    const overallStatus = params.overall_status ?? inferOverallStatus(cleanedItems);
    const { error: updateError } = await supabase
        .from("checklist_executions")
        .update({
            overall_status: overallStatus,
            completed_at: new Date().toISOString(),
            notes:
                params.notes === undefined || params.notes === null || `${params.notes}`.trim() === ""
                    ? null
                    : `${params.notes}`,
        } as any)
        .eq("id", executionId);

    if (updateError) throw updateError;

    return getExecutionDetail(supabase, user, executionId);
}
