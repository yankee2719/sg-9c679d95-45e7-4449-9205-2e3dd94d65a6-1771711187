import { supabase } from "@/integrations/supabase/client";

export type AuditEntityType =
    | "machine"
    | "document"
    | "document_version"
    | "maintenance_plan"
    | "work_order"
    | "checklist_template"
    | "plant"
    | "production_line"
    | "user";

export type AuditAction =
    | "create"
    | "update"
    | "delete"
    | "archive"
    | "restore"
    | "upload"
    | "download"
    | "new_version"
    | "status_change"
    | "qr_update"
    | "photo_update";

export interface CreateAuditLogParams {
    organizationId: string;
    actorUserId?: string | null;

    entityType: AuditEntityType;
    entityId: string;
    action: AuditAction;

    machineId?: string | null;
    documentId?: string | null;

    contextType?: string | null;
    contextId?: string | null;

    oldData?: Record<string, any> | null;
    newData?: Record<string, any> | null;
    metadata?: Record<string, any> | null;
}

export async function createAuditLog(params: CreateAuditLogParams) {
    const {
        organizationId,
        actorUserId,
        entityType,
        entityId,
        action,
        machineId,
        documentId,
        contextType,
        contextId,
        oldData,
        newData,
        metadata,
    } = params;

    const { data, error } = await supabase
        .from("audit_logs")
        .insert({
            organization_id: organizationId,
            actor_user_id: actorUserId ?? null,
            entity_type: entityType,
            entity_id: entityId,
            action,
            machine_id: machineId ?? null,
            document_id: documentId ?? null,
            context_type: contextType ?? null,
            context_id: contextId ?? null,
            old_data: oldData ?? null,
            new_data: newData ?? null,
            metadata: metadata ?? {},
        })
        .select("*")
        .single();

    if (error) throw error;
    return data;
}

export async function listAuditLogsForMachine(machineId: string) {
    const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("machine_id", machineId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
}

export async function listAuditLogsForDocument(documentId: string) {
    const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
}

export async function listAuditLogsForEntity(entityType: AuditEntityType, entityId: string) {
    const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
}

export function diffObjects(
    oldObj: Record<string, any> | null | undefined,
    newObj: Record<string, any> | null | undefined
) {
    const before = oldObj ?? {};
    const after = newObj ?? {};

    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();

    return keys
        .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
        .map((key) => ({
            field: key,
            oldValue: before[key] ?? null,
            newValue: after[key] ?? null,
        }));
}