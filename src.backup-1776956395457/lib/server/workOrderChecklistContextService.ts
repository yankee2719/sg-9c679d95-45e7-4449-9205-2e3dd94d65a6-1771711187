import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "@/lib/apiAuth";
import { getWorkOrderById } from "@/lib/server/workOrderApiService";

type ApiUser = AuthenticatedRequest["user"];

export async function getWorkOrderChecklistContext(
    supabase: SupabaseClient,
    user: ApiUser,
    workOrderId: string
) {
    const workOrder = await getWorkOrderById(supabase, user, workOrderId);
    if (!workOrder) {
        throw new Error("Work order not found.");
    }
    if (!workOrder.machine_id) {
        throw new Error("This work order is not linked to a machine.");
    }

    const { data: assignmentRows, error: assignmentError } = await supabase
        .from("checklist_assignments")
        .select("id, template_id, machine_id, production_line_id, organization_id, is_active")
        .eq("machine_id", workOrder.machine_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (assignmentError) throw assignmentError;

    const assignments = (assignmentRows ?? []) as any[];
    const templateIds = Array.from(new Set(assignments.map((row) => row.template_id).filter(Boolean)));

    const templateMap = new Map < string, any> ();
    if (templateIds.length > 0) {
        const { data: templateRows, error: templateError } = await supabase
            .from("checklist_templates")
            .select("id, name, version, is_active")
            .in("id", templateIds);

        if (templateError) throw templateError;
        for (const row of templateRows ?? []) {
            templateMap.set((row as any).id, row);
        }
    }

    const itemsByTemplateId = new Map < string, any[]> ();
    if (templateIds.length > 0) {
        const { data: itemRows, error: itemError } = await supabase
            .from("checklist_template_items")
            .select("id, template_id, title, description, input_type, is_required, order_index, metadata")
            .in("template_id", templateIds)
            .order("order_index", { ascending: true });

        if (itemError) throw itemError;
        for (const row of itemRows ?? []) {
            const templateId = (row as any).template_id as string;
            const bucket = itemsByTemplateId.get(templateId) ?? [];
            bucket.push({
                id: (row as any).id,
                title: (row as any).title,
                description: (row as any).description ?? null,
                input_type: (row as any).input_type,
                is_required: !!(row as any).is_required,
                order_index: Number((row as any).order_index ?? 0),
                metadata: (row as any).metadata ?? null,
            });
            itemsByTemplateId.set(templateId, bucket);
        }
    }

    const normalizedAssignments = assignments
        .map((assignment) => {
            const template = templateMap.get(assignment.template_id) ?? null;
            if (!template || template.is_active === false) return null;

            return {
                id: assignment.id,
                template_id: assignment.template_id,
                machine_id: assignment.machine_id ?? null,
                production_line_id: assignment.production_line_id ?? null,
                organization_id: assignment.organization_id,
                is_active: !!assignment.is_active,
                template: {
                    id: template.id,
                    name: template.name,
                    version: Number(template.version ?? 1),
                    is_active: !!template.is_active,
                },
                template_items: itemsByTemplateId.get(assignment.template_id) ?? [],
            };
        })
        .filter(Boolean);

    return {
        workOrder: {
            id: workOrder.id,
            title: workOrder.title,
            organization_id: workOrder.organization_id,
            machine_id: workOrder.machine_id ?? null,
        },
        assignments: normalizedAssignments,
    };
}
