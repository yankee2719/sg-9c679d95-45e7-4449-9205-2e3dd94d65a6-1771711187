// Compatibility wrapper aligned with the current MACHINA QR model.
// The real schema stores a single QR token directly on `machines`
// (`qr_code_token`, `qr_code_generated_at`) and the active REST API
// exposes QR operations via `/api/qr/**`.
//
// This file preserves the old service surface so legacy imports do not
// break build/runtime, but it no longer talks to removed tables/RPCs like:
// - machine_qr_tokens
// - qr_scan_logs
// - generate_qr_token
// - validate_qr_token

import { apiFetch } from "@/services/apiClient";

export type QrTokenType = "permanent" | "temporary" | "inspector" | "maintenance";

export interface QrToken {
    id: string;
    equipment_id: string;
    token_type: QrTokenType;
    token_prefix: string;
    qr_label?: string | null;
    allowed_views: string[];
    requires_auth: boolean;
    max_permission_level: string | null;
    expires_at?: string | null;
    is_active: boolean;
    scan_count: number;
    last_scanned_at?: string | null;
    created_at: string;
}

export interface QrScanResult {
    is_valid: boolean;
    equipment_id?: string;
    allowed_views?: string[];
    max_permission_level?: string | null;
    denial_reason?: string;
}

export class QrTokenService {
    async generateToken(
        equipmentId: string,
        _tokenType: QrTokenType,
        _createdBy: string,
        _options?: {
            expiresAt?: string;
            allowedViews?: string[];
            maxScans?: number;
            allowedRoles?: string[];
            label?: string;
        }
    ): Promise<{ tokenId: string; tokenCleartext: string; qrUrl: string }> {
        const payload = await apiFetch<{
success: boolean;
token_id: string;
token_cleartext: string;
qr_url: string;
}>("/api/qr/generate", {
            method: "POST",
            body: JSON.stringify({
                equipment_id: equipmentId,
                token_type: "permanent",
            }),
        });

        return {
            tokenId: payload.token_id,
            tokenCleartext: payload.token_cleartext,
            qrUrl: payload.qr_url,
        };
    }

    async validateToken(
        tokenCleartext: string,
        _userId?: string,
        _userRole?: string
    ): Promise<QrScanResult> {
        try {
            const payload = await apiFetch<{
success: boolean;
equipment_id?: string;
allowed_views?: string[];
max_permission_level?: string | null;
denial_reason?: string;
}>("/api/qr/validate", {
                method: "POST",
                body: JSON.stringify({ token: tokenCleartext }),
            });

            return {
                is_valid: !!payload.success,
                equipment_id: payload.equipment_id,
                allowed_views: Array.isArray(payload.allowed_views) ? payload.allowed_views : [],
                max_permission_level: payload.max_permission_level ?? null,
                denial_reason: payload.denial_reason,
            };
        } catch (error) {
            return {
                is_valid: false,
                denial_reason: error instanceof Error ? error.message : "access_denied",
            };
        }
    }

    async revokeToken(tokenId: string, _revokedBy: string, reason?: string): Promise<void> {
        // In the current model tokenId == machineId because there is one QR token per machine.
        await apiFetch(`/api/qr/equipment/${tokenId}`, {
            method: "DELETE",
            body: JSON.stringify({
                token_id: tokenId,
                reason: reason || "Revoked by user",
            }),
        });
    }

    async getEquipmentTokens(equipmentId: string): Promise<QrToken[]> {
        const payload = await apiFetch<{
success: boolean;
tokens?: Array<{
id: string;
equipment_id: string;
token_type: QrTokenType;
token_prefix: string;
qr_label?: string | null;
allowed_views?: string[] | null;
max_permission_level?: string | null;
expires_at?: string | null;
is_active: boolean;
scan_count: number;
last_scanned_at?: string | null;
created_at: string;
}>;
}>(`/api/qr/equipment/${equipmentId}`);

        return (payload.tokens ?? []).map((token) => ({
            id: token.id,
            equipment_id: token.equipment_id,
            token_type: token.token_type,
            token_prefix: token.token_prefix,
            qr_label: token.qr_label ?? "Machine QR",
            allowed_views: Array.isArray(token.allowed_views) ? token.allowed_views : ["passport", "events", "documents", "maintenance"],
            requires_auth: true,
            max_permission_level: token.max_permission_level ?? null,
            expires_at: token.expires_at ?? null,
            is_active: !!token.is_active,
            scan_count: Number(token.scan_count ?? 0),
            last_scanned_at: token.last_scanned_at ?? null,
            created_at: token.created_at,
        }));
    }

    async getScanHistory(equipmentId: string, limit = 50): Promise<any[]> {
        const payload = await apiFetch<{
success: boolean;
recent_scans?: any[];
}>(`/api/qr/equipment/${equipmentId}`);

        return Array.isArray(payload.recent_scans)
            ? payload.recent_scans.slice(0, limit)
            : [];
    }
}

let qrTokenInstance: QrTokenService | null = null;

export function getQrTokenService(): QrTokenService {
    if (!qrTokenInstance) {
        qrTokenInstance = new QrTokenService();
    }
    return qrTokenInstance;
}
