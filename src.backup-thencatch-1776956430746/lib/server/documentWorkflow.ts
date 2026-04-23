import { createHash } from "node:crypto";
import { getServiceSupabase, type AuthenticatedRequest } from "@/lib/apiAuth";

export function sha256Buffer(buffer: Buffer) {
    return createHash("sha256").update(buffer).digest("hex");
}

export function safeExt(name: string) {
    const ext = name.split(".").pop();
    return ext ? ext.toLowerCase() : "bin";
}

export function resolveMimeType(fileName: string, fallback?: string | null) {
    if (fallback && fallback.trim()) return fallback;
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".pdf")) return "application/pdf";
    if (lower.endsWith(".doc")) return "application/msword";
    if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
    if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".mp4")) return "video/mp4";
    if (lower.endsWith(".txt")) return "text/plain";
    return "application/octet-stream";
}

export function buildStoragePath(organizationId: string, documentId: string, versionNumber: number, fileName: string) {
    return `${organizationId}/${documentId}/v${versionNumber}_${Date.now()}.${safeExt(fileName)}`;
}

function normalizeManagerRole(role: string | null | undefined) {
    const raw = String(role ?? "").trim().toLowerCase();
    if (raw === "owner") return "admin";
    if (raw === "plant_manager") return "supervisor";
    if (raw === "viewer" || raw === "operator") return "technician";
    return raw;
}

export async function resolveDocumentAccess(req: AuthenticatedRequest, documentId: string) {
    const serviceSupabase = getServiceSupabase();
    const { data: document, error } = await serviceSupabase
        .from("documents")
        .select("id, title, organization_id, machine_id, current_version_id, version_count, storage_bucket, storage_path, mime_type, file_size, created_by, is_archived, external_url, category, description, tags, regulatory_reference, updated_at, created_at")
        .eq("id", documentId)
        .maybeSingle();

    if (error) throw error;
    if (!document) {
        return { document: null, canView: false, canManage: false, serviceSupabase };
    }

    const orgId = req.user.organizationId;
    const isOwnerOrg = !!orgId && document.organization_id === orgId;
    let isAssigned = false;

    if (document.machine_id && orgId) {
        const { data: assignments, error: assignmentsError } = await serviceSupabase
            .from("machine_assignments")
            .select("manufacturer_org_id, customer_org_id")
            .eq("machine_id", document.machine_id)
            .eq("is_active", true);
        if (assignmentsError) throw assignmentsError;
        isAssigned = (assignments ?? []).some((row: any) => row.manufacturer_org_id === orgId || row.customer_org_id === orgId);
    }

    const normalizedRole = normalizeManagerRole(req.user.role);
    const canView = req.user.isPlatformAdmin || isOwnerOrg || isAssigned;
    const canManage = req.user.isPlatformAdmin || (isOwnerOrg && (normalizedRole === "admin" || normalizedRole === "supervisor"));

    return { document, canView, canManage, serviceSupabase };
}

export async function canAttachToMachine(req: AuthenticatedRequest, machineId: string | null) {
    const serviceSupabase = getServiceSupabase();
    if (!machineId) {
        return { allowed: true, serviceSupabase };
    }

    const { data: machine, error } = await serviceSupabase
        .from("machines")
        .select("id, organization_id")
        .eq("id", machineId)
        .maybeSingle();
    if (error) throw error;
    if (!machine) return { allowed: false, serviceSupabase };

    const orgId = req.user.organizationId;
    if (orgId && machine.organization_id === orgId) {
        return { allowed: true, serviceSupabase };
    }

    const { data: assignments, error: assignmentsError } = await serviceSupabase
        .from("machine_assignments")
        .select("manufacturer_org_id, customer_org_id")
        .eq("machine_id", machineId)
        .eq("is_active", true);
    if (assignmentsError) throw assignmentsError;

    const allowed = (assignments ?? []).some((row: any) => row.manufacturer_org_id === orgId || row.customer_org_id === orgId);
    return { allowed, serviceSupabase };
}
