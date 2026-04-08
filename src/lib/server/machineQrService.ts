import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_ALLOWED_VIEWS = ["passport", "events", "documents", "maintenance"] as const;

export interface MachineQrTokenRecord {
    id: string;
    equipment_id: string;
    token_type: "permanent";
    token_prefix: string;
    qr_label: string | null;
    allowed_views: string[];
    max_permission_level: string | null;
    allowed_roles: string[] | null;
    max_scans: number | null;
    expires_at: string | null;
    is_active: boolean;
    scan_count: number;
    last_scanned_at: string | null;
    created_at: string;
}

function buildQrUrl(token: string): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
    if (appUrl) {
        return `${appUrl}/scan/${token}`;
    }
    return `/scan/${token}`;
}

export async function getMachineForQrAccess(
    supabase: SupabaseClient,
    machineId: string,
    requesterOrgId: string | null,
    isPlatformAdmin = false
) {
    const { data: machine, error } = await supabase
        .from("machines")
        .select("id, name, organization_id, qr_code_token, qr_code_generated_at, updated_at, is_archived, is_deleted")
        .eq("id", machineId)
        .maybeSingle();

    if (error) throw error;
    if (!machine || machine.is_archived || machine.is_deleted) return null;

    if (isPlatformAdmin) return machine;

    if (!requesterOrgId) return null;
    if (machine.organization_id === requesterOrgId) return machine;

    const { data: assignment, error: assignmentError } = await supabase
        .from("machine_assignments")
        .select("id")
        .eq("machine_id", machineId)
        .eq("customer_org_id", requesterOrgId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

    if (assignmentError) throw assignmentError;

    return assignment ? machine : null;
}

export async function getMachineByQrToken(
    supabase: SupabaseClient,
    token: string
) {
    const { data: machine, error } = await supabase
        .from("machines")
        .select("id, name, organization_id, qr_code_token, qr_code_generated_at, updated_at, is_archived, is_deleted")
        .eq("qr_code_token", token)
        .maybeSingle();

    if (error) throw error;
    if (!machine || machine.is_archived || machine.is_deleted) return null;
    return machine;
}

export async function generateMachineQrToken(
    supabase: SupabaseClient,
    machineId: string
) {
    const token = crypto.randomUUID();

    const { data: updated, error } = await supabase
        .from("machines")
        .update({
            qr_code_token: token,
            qr_code_generated_at: new Date().toISOString(),
        })
        .eq("id", machineId)
        .select("id, qr_code_token, qr_code_generated_at, updated_at")
        .single();

    if (error) throw error;

    return {
        tokenId: updated.id,
        tokenCleartext: token,
        qrUrl: buildQrUrl(token),
    };
}

export function toLegacyQrToken(machine: {
    id: string;
    qr_code_token: string | null;
    qr_code_generated_at?: string | null;
    updated_at?: string | null;
}): MachineQrTokenRecord[] {
    if (!machine.qr_code_token) return [];

    return [
        {
            id: machine.id,
            equipment_id: machine.id,
            token_type: "permanent",
            token_prefix: machine.qr_code_token.slice(0, 8),
            qr_label: "Machine QR",
            allowed_views: [...DEFAULT_ALLOWED_VIEWS],
            max_permission_level: null,
            allowed_roles: null,
            max_scans: null,
            expires_at: null,
            is_active: true,
            scan_count: 0,
            last_scanned_at: null,
            created_at:
                machine.qr_code_generated_at ||
                machine.updated_at ||
                new Date().toISOString(),
        },
    ];
}

export async function revokeMachineQrToken(
    supabase: SupabaseClient,
    machineId: string
) {
    const { error } = await supabase
        .from("machines")
        .update({
            qr_code_token: null,
            qr_code_generated_at: null,
        })
        .eq("id", machineId);

    if (error) throw error;
}

export function buildQrValidationPayload(machineId: string, role: string) {
    return {
        is_valid: true,
        equipment_id: machineId,
        allowed_views: [...DEFAULT_ALLOWED_VIEWS],
        max_permission_level: role,
    };
}

