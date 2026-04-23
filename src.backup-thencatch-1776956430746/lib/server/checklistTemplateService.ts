import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "@/lib/apiAuth";
import { hasMinimumCompatibleRole } from "@/lib/roles";

type ApiUser = AuthenticatedRequest["user"];

export class ChecklistTemplateError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.name = "ChecklistTemplateError";
        this.statusCode = statusCode;
    }
}

export type ChecklistTemplateInputType = "boolean" | "text" | "number" | "value";

export interface ChecklistTemplateDraftItem {
    title: string;
    description?: string | null;
    input_type: ChecklistTemplateInputType;
    is_required?: boolean;
    order_index?: number;
}

export interface SaveChecklistTemplateInput {
    templateId?: string | null;
    organizationId: string;
    name: string;
    description?: string | null;
    targetType: "machine" | "production_line";
    isActive: boolean;
    items: ChecklistTemplateDraftItem[];
}

export interface SaveChecklistTemplateResult {
    templateId: string;
    version: number;
    mode: "created" | "versioned";
    clonedAssignments: number;
}

function normalizeName(value: string) {
    return value.trim();
}

function normalizeDescription(value?: string | null) {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function normalizeItems(items: ChecklistTemplateDraftItem[]) {
    return items
        .map((item, index) => ({
            title: String(item.title || "").trim(),
            description: normalizeDescription(item.description),
            input_type: item.input_type,
            is_required: item.is_required ?? true,
            order_index: typeof item.order_index === "number" ? item.order_index : index,
        }))
        .sort((a, b) => a.order_index - b.order_index)
        .map((item, index) => ({ ...item, order_index: index }));
}

function assertCanManageTemplates(user: ApiUser) {
    if (!hasMinimumCompatibleRole(user.role, "supervisor")) {
        throw new ChecklistTemplateError("Insufficient permissions", 403);
    }
}

async function insertTemplateItems(
    serviceSupabase: SupabaseClient,
    organizationId: string,
    templateId: string,
    items: ReturnType<typeof normalizeItems>
) {
    const payload = items.map((item) => ({
        id: crypto.randomUUID(),
        template_id: templateId,
        organization_id: organizationId,
        title: item.title,
        description: item.description,
        input_type: item.input_type,
        is_required: item.is_required,
        order_index: item.order_index,
        metadata: {},
    }));

    const { error } = await serviceSupabase
        .from("checklist_template_items")
        .insert(payload as any);

    if (error) {
        throw new ChecklistTemplateError(error.message, 500);
    }
}

export async function saveChecklistTemplateVersion(
    serviceSupabase: SupabaseClient,
    user: ApiUser,
    input: SaveChecklistTemplateInput
): Promise<SaveChecklistTemplateResult> {
    assertCanManageTemplates(user);

    if (!user.organizationId) {
        throw new ChecklistTemplateError("No active organization context", 400);
    }

    if (input.organizationId !== user.organizationId && !user.isPlatformAdmin) {
        throw new ChecklistTemplateError(
            "You can only manage checklist templates in your active organization",
            403
        );
    }

    const name = normalizeName(input.name);
    const description = normalizeDescription(input.description);
    const items = normalizeItems(input.items || []);

    if (!name) {
        throw new ChecklistTemplateError("Template name is required", 400);
    }

    if (items.length === 0) {
        throw new ChecklistTemplateError("At least one checklist item is required", 400);
    }

    if (items.some((item) => !item.title)) {
        throw new ChecklistTemplateError("Every checklist item must have a title", 400);
    }

    let createdTemplateId: string | null = null;
    let createdAssignmentIds: string[] = [];
    let previousAssignmentIds: string[] = [];
    let previousTemplateId: string | null = null;
    let previousTemplateWasActive = false;

    try {
        if (!input.templateId) {
            const { data: createdTemplate, error: createError } = await serviceSupabase
                .from("checklist_templates")
                .insert({
                    organization_id: input.organizationId,
                    name,
                    description,
                    target_type: input.targetType,
                    version: 1,
                    is_active: input.isActive,
                } as any)
                .select("id, version")
                .single();

            if (createError || !createdTemplate) {
                throw new ChecklistTemplateError(
                    createError?.message ?? "Failed to create checklist template",
                    500
                );
            }

            createdTemplateId = (createdTemplate as any).id;
            await insertTemplateItems(serviceSupabase, input.organizationId, createdTemplateId, items);

            return {
                templateId: createdTemplateId,
                version: Number((createdTemplate as any).version ?? 1),
                mode: "created",
                clonedAssignments: 0,
            };
        }

        previousTemplateId = input.templateId;

        const { data: previousTemplate, error: previousTemplateError } = await serviceSupabase
            .from("checklist_templates")
            .select("id, organization_id, version, is_active")
            .eq("id", input.templateId)
            .eq("organization_id", input.organizationId)
            .maybeSingle();

        if (previousTemplateError) {
            throw new ChecklistTemplateError(previousTemplateError.message, 500);
        }

        if (!previousTemplate) {
            throw new ChecklistTemplateError("Checklist template not found", 404);
        }

        previousTemplateWasActive = Boolean((previousTemplate as any).is_active ?? true);
        const nextVersion = Number((previousTemplate as any).version ?? 1) + 1;

        const { data: newTemplate, error: newTemplateError } = await serviceSupabase
            .from("checklist_templates")
            .insert({
                organization_id: input.organizationId,
                name,
                description,
                target_type: input.targetType,
                version: nextVersion,
                is_active: input.isActive,
            } as any)
            .select("id, version")
            .single();

        if (newTemplateError || !newTemplate) {
            throw new ChecklistTemplateError(
                newTemplateError?.message ?? "Failed to create checklist template version",
                500
            );
        }

        createdTemplateId = (newTemplate as any).id;
        await insertTemplateItems(serviceSupabase, input.organizationId, createdTemplateId, items);

        const { data: activeAssignments, error: activeAssignmentsError } = await serviceSupabase
            .from("checklist_assignments")
            .select("id, organization_id, machine_id, production_line_id")
            .eq("organization_id", input.organizationId)
            .eq("template_id", input.templateId)
            .eq("is_active", true);

        if (activeAssignmentsError) {
            throw new ChecklistTemplateError(activeAssignmentsError.message, 500);
        }

        const assignmentRows = (activeAssignments ?? []) as Array<{
            id: string;
            organization_id: string;
            machine_id: string | null;
            production_line_id: string | null;
        }>;

        previousAssignmentIds = assignmentRows.map((row) => row.id);

        if (assignmentRows.length > 0) {
            const clones = assignmentRows.map((row) => ({
                id: crypto.randomUUID(),
                organization_id: row.organization_id,
                template_id: createdTemplateId,
                machine_id: row.machine_id,
                production_line_id: row.production_line_id,
                is_active: input.isActive,
            }));

            const { error: cloneAssignmentsError } = await serviceSupabase
                .from("checklist_assignments")
                .insert(clones as any);

            if (cloneAssignmentsError) {
                throw new ChecklistTemplateError(cloneAssignmentsError.message, 500);
            }

            createdAssignmentIds = clones.map((row) => row.id);

            const { error: deactivatePreviousAssignmentsError } = await serviceSupabase
                .from("checklist_assignments")
                .update({ is_active: false } as any)
                .in("id", previousAssignmentIds);

            if (deactivatePreviousAssignmentsError) {
                throw new ChecklistTemplateError(deactivatePreviousAssignmentsError.message, 500);
            }
        }

        const { error: deactivatePreviousTemplateError } = await serviceSupabase
            .from("checklist_templates")
            .update({ is_active: false } as any)
            .eq("id", input.templateId)
            .eq("organization_id", input.organizationId);

        if (deactivatePreviousTemplateError) {
            throw new ChecklistTemplateError(deactivatePreviousTemplateError.message, 500);
        }

        return {
            templateId: createdTemplateId,
            version: Number((newTemplate as any).version ?? nextVersion),
            mode: "versioned",
            clonedAssignments: createdAssignmentIds.length,
        };
    } catch (error) {
        if (previousAssignmentIds.length > 0) {
            await serviceSupabase
                .from("checklist_assignments")
                .update({ is_active: true } as any)
                .in("id", previousAssignmentIds)
                .then(() => undefined)
                .catch((rollbackError) => {
                    console.error("Checklist assignment rollback failed:", rollbackError);
                });
        }

        if (previousTemplateId && previousTemplateWasActive) {
            await serviceSupabase
                .from("checklist_templates")
                .update({ is_active: true } as any)
                .eq("id", previousTemplateId)
                .then(() => undefined)
                .catch((rollbackError) => {
                    console.error("Checklist template rollback failed:", rollbackError);
                });
        }

        if (createdAssignmentIds.length > 0) {
            await serviceSupabase
                .from("checklist_assignments")
                .delete()
                .in("id", createdAssignmentIds)
                .then(() => undefined)
                .catch((rollbackError) => {
                    console.error("Checklist cloned assignments cleanup failed:", rollbackError);
                });
        }

        if (createdTemplateId) {
            await serviceSupabase
                .from("checklist_template_items")
                .delete()
                .eq("template_id", createdTemplateId)
                .then(() => undefined)
                .catch((rollbackError) => {
                    console.error("Checklist template items cleanup failed:", rollbackError);
                });

            await serviceSupabase
                .from("checklist_templates")
                .delete()
                .eq("id", createdTemplateId)
                .then(() => undefined)
                .catch((rollbackError) => {
                    console.error("Checklist template cleanup failed:", rollbackError);
                });
        }

        if (error instanceof ChecklistTemplateError) {
            throw error;
        }

        throw new ChecklistTemplateError(
            error instanceof Error ? error.message : "Unexpected checklist template save error",
            500
        );
    }
}
