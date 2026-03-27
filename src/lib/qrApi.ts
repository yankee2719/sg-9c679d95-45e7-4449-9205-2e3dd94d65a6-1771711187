import { apiFetch } from "@/services/apiClient";

export type QrTokenType = "permanent" | "temporary" | "inspector" | "maintenance";

export interface QrToken {
    id: string;
    equipment_id: string;
    token_type: QrTokenType;
    token_prefix: string;
    label?: string | null;
    allowed_views?: string[] | null;
    max_permission_level?: string | null;
    allowed_roles?: string[] | null;
    max_scans?: number | null;
    expires_at?: string | null;
    is_active: boolean;
    scan_count: number;
    last_scanned_at?: string | null;
    created_at: string;
}

export interface QrScanHistoryItem {
    id: string;
    access_granted: boolean;
    denial_reason?: string | null;
    scanned_at: string;
    was_offline?: boolean | null;
}

export interface QrTokenListResponse {
    success: boolean;
    tokens: QrToken[];
    recent_scans: QrScanHistoryItem[];
    active_count: number;
    total_scans: number;
}

export interface GenerateQrTokenInput {
    equipment_id: string;
    token_type: QrTokenType;
    expires_at?: string;
    max_scans?: number;
}

export interface GenerateQrTokenResponse {
    success: boolean;
    message: string;
    token_id: string;
    token_cleartext: string;
    qr_url: string;
}

export async function listQrTokensForEquipment(equipmentId: string): Promise<QrTokenListResponse> {
    return apiFetch < QrTokenListResponse > (`/api/qr/equipment/${equipmentId}`);
}

export async function generateQrToken(input: GenerateQrTokenInput): Promise<GenerateQrTokenResponse> {
    return apiFetch < GenerateQrTokenResponse > ("/api/qr/generate", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export async function revokeQrToken(equipmentId: string, tokenId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    return apiFetch < { success: boolean; message: string } > (`/api/qr/equipment/${equipmentId}`, {
        method: "DELETE",
        body: JSON.stringify({ token_id: tokenId, reason: reason || "Manually revoked" }),
    });
}
