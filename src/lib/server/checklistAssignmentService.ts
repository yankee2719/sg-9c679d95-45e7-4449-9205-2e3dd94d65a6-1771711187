import { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "@/lib/apiAuth";

type ApiUser = AuthenticatedRequest["user"];

export class ChecklistAssignmentError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.name = "ChecklistAssignmentError";
        this.statusCode = statusCode;
    }
}

export interface ChecklistAssignmentTemplateOption {
    id: string;
    name: string;
    target_type: string;
    version: number;
}

export interface ChecklistAssignmentMachineOption {
    id: string;
    name: string;
    internal_code: string | null;
    organization_id: string | null;
}

export interface ChecklistAssignmentListItem {
    id: string;
    organization_id: string;
    template_id: string;
    machine_id: string | null;
    production_line_id: string | null;
    is_active: boolean | null;
    created_at: string | null;
    template: ChecklistAssignmentTemplateOption | null;
    machine: ChecklistAssignmentMachineOption | null;
}

export interface ChecklistAssignmentListResponse {
    templates: ChecklistAssignmentTemplateOption[];
    machines: ChecklistAssignmentMachineOption[];
    assignments: ChecklistAssignmentListItem[];
}

function canManageAssignments(user: ApiUser) {
    return ["owner", "admin", "supervisor"].includes(user.role);
}

export async function listChecklistAssignments(
    supabase: SupabaseClient,
    user: ApiUser
): Promise<ChecklistAssignmentListResponse> {
    const organizationId = user.organizationId;
    if (!organizationId) {
        throw new ChecklistAssignmentError("Active organization not found.", 400);
    }

    const [templatesRes, machinesRes, assignmentsRes] = await Promise.all([
        supabase
            .from("checklist_templates")
            .select("id, name, target_type, version")
            .eq("organization_id", organizationId)
            .eq("is_active", true)
            .order("name", { ascending: true }),
        supabase
            .from("machines")
            .select("id, name, internal_code, organization_id")
            .eq("organization_id", organizationId)
            .eq("is_archived", false)
            .or("is_deleted.is.null,is_deleted.eq.false")
            .order("name", { ascending: true }),
        supabase
            .from("checklist_assignments")
            .select("id, organization_id, template_id, machine_id, production_line_id, is_active, created_at")
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false }),
    ]);

    if (templatesRes.error) throw templatesRes.error;
    if (machinesRes.error) throw machinesRes.error;
    if (assignmentsRes.error) throw assignmentsRes.error;

    const templates = (templatesRes.data ?? []) as ChecklistAssignmentTemplateOption[];
    const machines = (machinesRes.data ?? []) as ChecklistAssignmentMachineOption[];
    const assignments = (assignmentsRes.data ?? []) as Omit<ChecklistAssignmentListItem, "template" | "machine">[];

    const templateMap = new Map(templates.map((row) => [row.id, row]));
    const machineMap = new Map(machines.map((row) => [row.id, row]));

    return {
        templates,
        machines,
        assignments: assignments.map((row) => ({
            ...row,
            template: templateMap.get(row.template_id) ?? null,
            machine: row.machine_id ? machineMap.get(row.machine_id) ?? null : null,
        })),
    };
}

export async function createChecklistAssignment(
    supabase: SupabaseClient,
    user: ApiUser,
    params: { templateId: string; machineId: string }
): Promise<ChecklistAssignmentListItem> {
    const organizationId = user.organizationId;
    if (!organizationId) {
        throw new ChecklistAssignmentError("Active organization not found.", 400);
    }
    if (!canManageAssignments(user) && !user.isPlatformAdmin) {
        throw new ChecklistAssignmentError("You are not allowed to manage checklist assignments.", 403);
    }
    if (!params.templateId || !params.machineId) {
        throw new ChecklistAssignmentError("template_id and machine_id are required.", 400);
    }

    const [templateRes, machineRes, duplicateRes] = await Promise.all([
        supabase
            .from("checklist_templates")
            .select("id, name, target_type, version, is_active, organization_id")
            .eq("id", params.templateId)
            .eq("organization_id", organizationId)
            .maybeSingle(),
        supabase
            .from("machines")
            .select("id, name, internal_code, organization_id, is_archived, is_deleted")
            .eq("id", params.machineId)
            .eq("organization_id", organizationId)
            .maybeSingle(),
        supabase
            .from("checklist_assignments")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("template_id", params.templateId)
            .eq("machine_id", params.machineId)
            .eq("is_active", true)
            .maybeSingle(),
    ]);

    if (templateRes.error) throw templateRes.error;
    if (machineRes.error) throw machineRes.error;
    if (duplicateRes.error) throw duplicateRes.error;

    if (!templateRes.data) {
        throw new ChecklistAssignmentError("Checklist template not found.", 404);
    }
    if (!templateRes.data.is_active) {
        throw new ChecklistAssignmentError("Only active checklist templates can be assigned.", 409);
    }
    if (!machineRes.data) {
        throw new ChecklistAssignmentError("Machine not found.", 404);
    }
    if (machineRes.data.is_archived || machineRes.data.is_deleted === true) {
        throw new ChecklistAssignmentError("Checklist cannot be assigned to an archived machine.", 409);
    }
    if (duplicateRes.data?.id) {
        throw new ChecklistAssignmentError("This checklist is already assigned to the selected machine.", 409);
    }

    const { data: inserted, error: insertError } = await supabase
        .from("checklist_assignments")
        .insert({
            organization_id: organizationId,
            template_id: params.templateId,
            machine_id: params.machineId,
            production_line_id: null,
            is_active: true,
        } as any)
        .select("id, organization_id, template_id, machine_id, production_line_id, is_active, created_at")
        .single();

    if (insertError) throw insertError;

    return {
        ...(inserted as any),
        template: {
            id: templateRes.data.id,
            name: templateRes.data.name,
            target_type: templateRes.data.target_type,
            version: Number(templateRes.data.version ?? 1),
        },
        machine: {
            id: machineRes.data.id,
            name: machineRes.data.name,
            internal_code: machineRes.data.internal_code ?? null,
            organization_id: machineRes.data.organization_id ?? null,
        },
    };
}

export async function deactivateChecklistAssignment(
    supabase: SupabaseClient,
    user: ApiUser,
    assignmentId: string
): Promise<{ success: true }> {
    const organizationId = user.organizationId;
    if (!organizationId) {
        throw new ChecklistAssignmentError("Active organization not found.", 400);
    }
    if (!canManageAssignments(user) && !user.isPlatformAdmin) {
        throw new ChecklistAssignmentError("You are not allowed to manage checklist assignments.", 403);
    }
    if (!assignmentId) {
        throw new ChecklistAssignmentError("assignment_id is required.", 400);
    }

    const { data: assignment, error: fetchError } = await supabase
        .from("checklist_assignments")
        .select("id, is_active, organization_id")
        .eq("id", assignmentId)
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (fetchError) throw fetchError;
    if (!assignment) {
        throw new ChecklistAssignmentError("Checklist assignment not found.", 404);
    }
    if (assignment.is_active === false) {
        return { success: true };
    }

    const { error: updateError } = await supabase
        .from("checklist_assignments")
        .update({ is_active: false } as any)
        .eq("id", assignmentId)
        .eq("organization_id", organizationId);

    if (updateError) throw updateError;
    return { success: true };
}

