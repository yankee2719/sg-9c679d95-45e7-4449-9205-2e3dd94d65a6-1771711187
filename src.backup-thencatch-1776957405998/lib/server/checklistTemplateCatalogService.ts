import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "@/lib/apiAuth";

type ApiUser = AuthenticatedRequest["user"];

export type ChecklistTemplateInputType = "boolean" | "text" | "number" | "value";

export interface ChecklistTemplateCatalogRow {
    id: string;
    name: string | null;
    description: string | null;
    target_type: string | null;
    version: number | null;
    is_active: boolean | null;
    created_at: string | null;
    item_count: number;
}

export interface ChecklistTemplateDetailItem {
    id: string;
    title: string | null;
    description: string | null;
    input_type: ChecklistTemplateInputType;
    is_required: boolean | null;
    order_index: number | null;
}

export interface ChecklistTemplateDetail {
    id: string;
    name: string | null;
    description: string | null;
    target_type: string | null;
    version: number | null;
    is_active: boolean | null;
    created_at: string | null;
    items: ChecklistTemplateDetailItem[];
}

export interface SaveChecklistTemplatePayload {
    template_id?: string | null;
    name: string;
    description?: string | null;
    target_type: "machine" | "production_line";
    is_active: boolean;
    items: Array<{
        title: string;
        description?: string | null;
        input_type: ChecklistTemplateInputType;
        is_required: boolean;
        order_index: number;
    }>;
}

export class ChecklistTemplateError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.name = "ChecklistTemplateError";
        this.statusCode = statusCode;
    }
}

function requireOrganization(user: ApiUser) {
    if (!user.organizationId) {
        throw new ChecklistTemplateError("No active organization context", 400);
    }
    return user.organizationId;
}

function ensureManager(user: ApiUser) {
    if (!["owner", "admin", "supervisor"].includes(user.role) && !user.isPlatformAdmin) {
        throw new ChecklistTemplateError("Only admins and supervisors can manage checklist templates.", 403);
    }
}

export async function listChecklistTemplateCatalog(
    supabase: SupabaseClient,
    user: ApiUser
): Promise<ChecklistTemplateCatalogRow[]> {
    const organizationId = requireOrganization(user);

    const { data: templates, error: templatesError } = await supabase
        .from("checklist_templates")
        .select("id, name, description, target_type, version, is_active, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

    if (templatesError) throw templatesError;

    const templateRows = (templates ?? []) as Omit<ChecklistTemplateCatalogRow, "item_count">[];
    if (templateRows.length === 0) return [];

    const templateIds = templateRows.map((row) => row.id);
    const { data: itemRows, error: itemError } = await supabase
        .from("checklist_template_items")
        .select("template_id")
        .in("template_id", templateIds);

    if (itemError) throw itemError;

    const countMap = new Map<string, number>();
    for (const row of itemRows ?? []) {
        const templateId = (row as any).template_id as string | undefined;
        if (!templateId) continue;
        countMap.set(templateId, (countMap.get(templateId) ?? 0) + 1);
    }

    return templateRows.map((row) => ({
        ...row,
        item_count: countMap.get(row.id) ?? 0,
    }));
}

export async function getChecklistTemplateDetail(
    supabase: SupabaseClient,
    user: ApiUser,
    templateId: string
): Promise<ChecklistTemplateDetail> {
    const organizationId = requireOrganization(user);
    if (!templateId) {
        throw new ChecklistTemplateError("Template id is required.", 400);
    }

    const { data: template, error: templateError } = await supabase
        .from("checklist_templates")
        .select("id, name, description, target_type, version, is_active, created_at")
        .eq("organization_id", organizationId)
        .eq("id", templateId)
        .maybeSingle();

    if (templateError) throw templateError;
    if (!template) {
        throw new ChecklistTemplateError("Checklist template not found.", 404);
    }

    const { data: items, error: itemsError } = await supabase
        .from("checklist_template_items")
        .select("id, title, description, input_type, is_required, order_index")
        .eq("template_id", templateId)
        .order("order_index", { ascending: true });

    if (itemsError) throw itemsError;

    return {
        ...(template as any),
        items: ((items ?? []) as any[]).map((item) => ({
            id: item.id,
            title: item.title ?? null,
            description: item.description ?? null,
            input_type: (item.input_type ?? "boolean") as ChecklistTemplateInputType,
            is_required: Boolean(item.is_required ?? true),
            order_index: Number(item.order_index ?? 0),
        })),
    };
}

export async function saveChecklistTemplate(
    supabase: SupabaseClient,
    user: ApiUser,
    payload: SaveChecklistTemplatePayload
): Promise<{ template_id: string; created_new_version: boolean }> {
    const organizationId = requireOrganization(user);
    ensureManager(user);

    const name = payload.name?.trim();
    const items = Array.isArray(payload.items) ? payload.items : [];

    if (!name) {
        throw new ChecklistTemplateError("Template name is required.", 400);
    }
    if (!["machine", "production_line"].includes(payload.target_type)) {
        throw new ChecklistTemplateError("Invalid target_type.", 400);
    }
    if (items.length === 0) {
        throw new ChecklistTemplateError("At least one checklist item is required.", 400);
    }
    if (items.some((item) => !item.title?.trim())) {
        throw new ChecklistTemplateError("All checklist items must have a title.", 400);
    }

    const normalizedItems = items.map((item, index) => ({
        title: item.title.trim(),
        description: item.description?.trim() || null,
        input_type: ["boolean", "text", "number", "value"].includes(item.input_type)
            ? item.input_type
            : "boolean",
        is_required: Boolean(item.is_required),
        order_index: Number.isFinite(item.order_index) ? item.order_index : index,
    }));

    if (!payload.template_id) {
        const newTemplateId = randomUUID();
        const { error: insertTemplateError } = await supabase
            .from("checklist_templates")
            .insert({
                id: newTemplateId,
                organization_id: organizationId,
                name,
                description: payload.description?.trim() || null,
                target_type: payload.target_type,
                version: 1,
                is_active: payload.is_active,
            } as any);

        if (insertTemplateError) throw insertTemplateError;

        const { error: insertItemsError } = await supabase
            .from("checklist_template_items")
            .insert(
                normalizedItems.map((item, index) => ({
                    id: randomUUID(),
                    template_id: newTemplateId,
                    organization_id: organizationId,
                    title: item.title,
                    description: item.description,
                    input_type: item.input_type,
                    is_required: item.is_required,
                    order_index: index,
                    metadata: {},
                })) as any
            );

        if (insertItemsError) throw insertItemsError;

        return { template_id: newTemplateId, created_new_version: false };
    }

    const { data: currentTemplate, error: currentTemplateError } = await supabase
        .from("checklist_templates")
        .select("id, version, organization_id")
        .eq("id", payload.template_id)
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (currentTemplateError) throw currentTemplateError;
    if (!currentTemplate) {
        throw new ChecklistTemplateError("Checklist template not found.", 404);
    }

    const newTemplateId = randomUUID();
    const nextVersion = Number(currentTemplate.version ?? 1) + 1;

    const { error: insertVersionError } = await supabase
        .from("checklist_templates")
        .insert({
            id: newTemplateId,
            organization_id: organizationId,
            name,
            description: payload.description?.trim() || null,
            target_type: payload.target_type,
            version: nextVersion,
            is_active: payload.is_active,
        } as any);

    if (insertVersionError) throw insertVersionError;

    const { error: insertVersionItemsError } = await supabase
        .from("checklist_template_items")
        .insert(
            normalizedItems.map((item, index) => ({
                id: randomUUID(),
                template_id: newTemplateId,
                organization_id: organizationId,
                title: item.title,
                description: item.description,
                input_type: item.input_type,
                is_required: item.is_required,
                order_index: index,
                metadata: {},
            })) as any
        );

    if (insertVersionItemsError) throw insertVersionItemsError;

    const { error: moveAssignmentsError } = await supabase
        .from("checklist_assignments")
        .update({ template_id: newTemplateId } as any)
        .eq("organization_id", organizationId)
        .eq("template_id", payload.template_id)
        .eq("is_active", true);

    if (moveAssignmentsError) throw moveAssignmentsError;

    const { error: deactivateOldError } = await supabase
        .from("checklist_templates")
        .update({ is_active: false } as any)
        .eq("organization_id", organizationId)
        .eq("id", payload.template_id);

    if (deactivateOldError) throw deactivateOldError;

    return { template_id: newTemplateId, created_new_version: true };
}
