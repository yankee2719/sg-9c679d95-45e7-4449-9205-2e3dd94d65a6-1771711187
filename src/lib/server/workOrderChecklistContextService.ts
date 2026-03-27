import { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "@/lib/apiAuth";
import { getWorkOrderById } from "@/lib/server/workOrderApiService";

type ApiUser = AuthenticatedRequest["user"];

export class WorkOrderChecklistContextError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.name = "WorkOrderChecklistContextError";
        this.statusCode = statusCode;
    }
}

export interface WorkOrderChecklistTemplateItem {
    id: string;
    title: string;
    description: string | null;
    input_type: string;
    is_required: boolean;
    order_index: number;
    metadata: Record<string, any>;
}

export interface WorkOrderChecklistAssignmentContext {
    id: string;
    template_id: string;
    machine_id: string | null;
    production_line_id: string | null;
    is_active: boolean | null;
    template: {
        id: string;
        name: string;
        version: number;
        is_active: boolean;
    } | null;
    items: WorkOrderChecklistTemplateItem[];
}

export interface WorkOrderChecklistExecutionContext {
    workOrder: {
        id: string;
        organization_id: string;
        machine_id: string | null;
        title: string;
        status: string | null;
        plant_id: string | null;
    };
    assignments: WorkOrderChecklistAssignmentContext[];
}

export async function getWorkOrderChecklistContext(
    supabase: SupabaseClient,
    user: ApiUser,
    workOrderId: string
): Promise<WorkOrderChecklistExecutionContext> {
    const workOrder = await getWorkOrderById(supabase, user, workOrderId);
    if (!workOrder) {
        throw new WorkOrderChecklistContextError("Work order not found.", 404);
    }

    if (!(workOrder as any).machine_id) {
        throw new WorkOrderChecklistContextError("The work order is not linked to a machine.", 409);
    }

    const organizationId = String((workOrder as any).organization_id);
    const machineId = String((workOrder as any).machine_id);

    const { data: assignmentRows, error: assignmentError } = await supabase
        .from("checklist_assignments")
        .select("id, template_id, machine_id, production_line_id, is_active")
        .eq("organization_id", organizationId)
        .eq("machine_id", machineId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (assignmentError) throw assignmentError;

    const assignments = (assignmentRows ?? []) as Array<{
        id: string;
        template_id: string;
        machine_id: string | null;
        production_line_id: string | null;
        is_active: boolean | null;
    }>;

    const templateIds = Array.from(new Set(assignments.map((row) => row.template_id).filter(Boolean)));
    const templateMap = new Map < string, any> ();
    const itemsMap = new Map < string, WorkOrderChecklistTemplateItem[]> ();

    if (templateIds.length > 0) {
        const [templateRes, itemsRes] = await Promise.all([
            supabase
                .from("checklist_templates")
                .select("id, name, version, is_active")
                .in("id", templateIds),
            supabase
                .from("checklist_template_items")
                .select("id, template_id, title, description, input_type, is_required, order_index, metadata")
                .in("template_id", templateIds)
                .order("order_index", { ascending: true }),
        ]);

        if (templateRes.error) throw templateRes.error;
        if (itemsRes.error) throw itemsRes.error;

        for (const row of templateRes.data ?? []) {
            templateMap.set((row as any).id, row);
        }
        for (const row of itemsRes.data ?? []) {
            const templateId = String((row as any).template_id);
            const current = itemsMap.get(templateId) ?? [];
            current.push({
                id: String((row as any).id),
                title: String((row as any).title ?? ""),
                description: ((row as any).description ?? null) as string | null,
                input_type: String((row as any).input_type ?? "boolean"),
                is_required: Boolean((row as any).is_required),
                order_index: Number((row as any).order_index ?? 0),
                metadata: ((row as any).metadata ?? {}) as Record<string, any>,
            });
            itemsMap.set(templateId, current);
        }
    }

    return {
        workOrder: {
            id: String((workOrder as any).id),
            organization_id: organizationId,
            machine_id: (workOrder as any).machine_id ?? null,
            title: String((workOrder as any).title ?? ""),
            status: ((workOrder as any).status ?? null) as string | null,
            plant_id: ((workOrder as any).plant_id ?? null) as string | null,
        },
        assignments: assignments.map((assignment) => {
            const template = templateMap.get(assignment.template_id) ?? null;
            return {
                ...assignment,
                template: template
                    ? {
                        id: String(template.id),
                        name: String(template.name ?? "Template"),
                        version: Number(template.version ?? 1),
                        is_active: Boolean(template.is_active),
                    }
                    : null,
                items: itemsMap.get(assignment.template_id) ?? [],
            };
        }),
    };
}

