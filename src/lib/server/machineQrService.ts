import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "@/lib/apiAuth";

type ApiUser = AuthenticatedRequest["user"];

export const DEFAULT_QR_ALLOWED_VIEWS = [
    "passport",
    "events",
    "documents",
    "maintenance",
] as const;

export interface MachineQrRow {
    id: string;
    name: string;
    organization_id: string | null;
    qr_code_token: string | null;
    qr_code_generated_at: string | null;
    updated_at: string | null;
    is_archived?: boolean | null;
    is_deleted?: boolean | null;
}

export function getBaseAppUrl() {
    const raw =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000";

    return raw.replace(/\/$/, "");
}

export async function getMachineById(
    supabase: SupabaseClient,
    machineId: string
): Promise<MachineQrRow | null> {
    const { data, error } = await supabase
        .from("machines")
        .select(
            "id, name, organization_id, qr_code_token, qr_code_generated_at, updated_at, is_archived, is_deleted"
        )
        .eq("id", machineId)
        .maybeSingle();

    if (error) throw error;
    return (data as MachineQrRow | null) ?? null;
}

export async function getMachineByQrToken(
    supabase: SupabaseClient,
    token: string
): Promise<MachineQrRow | null> {
    const { data, error } = await supabase
        .from("machines")
        .select(
            "id, name, organization_id, qr_code_token, qr_code_generated_at, updated_at, is_archived, is_deleted"
        )
        .eq("qr_code_token", token)
        .maybeSingle();

    if (error) throw error;
    return (data as MachineQrRow | null) ?? null;
}

async function hasAssignmentAccess(
    supabase: SupabaseClient,
    machineId: string,
    organizationId: string
) {
    const { data, error } = await supabase
        .from("machine_assignments")
        .select("id")
        .eq("machine_id", machineId)
        .eq("is_active", true)
        .or(
            `manufacturer_org_id.eq.${organizationId},customer_org_id.eq.${organizationId}`
        )
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return !!data;
}

export async function canViewMachineViaQr(
    supabase: SupabaseClient,
    user: ApiUser,
    machine: MachineQrRow
) {
    if (user.isPlatformAdmin) return true;
    if (!user.organizationId) return false;
    if (machine.organization_id === user.organizationId) return true;
    return hasAssignmentAccess(supabase, machine.id, user.organizationId);
}

export async function canManageMachineQr(
    supabase: SupabaseClient,
    user: ApiUser,
    machine: MachineQrRow
) {
    if (user.isPlatformAdmin) return true;
    if (!user.organizationId) return false;
    if (machine.organization_id !== user.organizationId) return false;
    return ["admin", "supervisor"].includes(user.role);
}

export function buildQrTokenResponse(machine: MachineQrRow) {
    if (!machine.qr_code_token) {
        return [];
    }

    return [
        {
            id: machine.id,
            equipment_id: machine.id,
            token_type: "permanent" as const,
            token_prefix: machine.qr_code_token.slice(0, 8),
            qr_label: machine.name ?? null,
            allowed_views: [...DEFAULT_QR_ALLOWED_VIEWS],
            requires_auth: true,
            max_permission_level: "organization_member",
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

export function createMachineQrToken() {
    return crypto.randomUUID().replace(/-/g, "");
}

