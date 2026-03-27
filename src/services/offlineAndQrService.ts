// Legacy compatibility wrapper.
// Offline sync has been moved out of this file; keep only QR token service until the last imports disappear.

import { createClient } from "@supabase/supabase-js";

export type QrTokenType = "permanent" | "temporary" | "inspector" | "maintenance";

export interface QrToken {
    id: string;
    equipment_id: string;
    token_type: QrTokenType;
    token_prefix: string;
    qr_label?: string | null;
    allowed_views: string[];
    requires_auth: boolean;
    max_permission_level: string;
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
    max_permission_level?: string;
    denial_reason?: string;
}

function getBaseAppUrl() {
    const raw =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000";
    return raw.replace(/\/$/, "");
}

export class QrTokenService {
    private supabase: ReturnType<typeof createClient>;

    constructor() {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }

    async generateToken(
        equipmentId: string,
        tokenType: QrTokenType,
        createdBy: string,
        options?: {
            expiresAt?: string;
            allowedViews?: string[];
            maxScans?: number;
            allowedRoles?: string[];
            label?: string;
        }
    ): Promise<{ tokenId: string; tokenCleartext: string; qrUrl: string }> {
        const { data, error } = await this.supabase.rpc("generate_qr_token", {
            p_equipment_id: equipmentId,
            p_token_type: tokenType,
            p_created_by: createdBy,
            p_expires_at: options?.expiresAt || null,
            p_allowed_views: options?.allowedViews || ["passport", "events", "documents", "maintenance"],
            p_max_scans: options?.maxScans || null,
            p_allowed_roles: options?.allowedRoles || null,
        });

        if (error) throw error;

        const tokenId = data?.[0]?.token_id;
        const tokenCleartext = data?.[0]?.token_cleartext;
        if (!tokenId || !tokenCleartext) {
            throw new Error("QR token generation returned an invalid payload");
        }

        return {
            tokenId,
            tokenCleartext,
            qrUrl: `${getBaseAppUrl()}/scan/${tokenCleartext}`,
        };
    }

    async validateToken(tokenCleartext: string, userId?: string, userRole?: string): Promise<QrScanResult> {
        const { data, error } = await this.supabase.rpc("validate_qr_token", {
            p_token_cleartext: tokenCleartext,
            p_user_id: userId || null,
            p_user_role: userRole || null,
        });

        if (error) throw error;

        const result = data?.[0] as QrScanResult | undefined;
        if (result) {
            await this.logScan(tokenCleartext, result, userId);
        }
        return result || { is_valid: false, denial_reason: "access_denied" };
    }

    async revokeToken(tokenId: string, revokedBy: string, reason?: string): Promise<void> {
        const { error } = await this.supabase
            .from("machine_qr_tokens")
            .update({
                is_active: false,
                revoked_at: new Date().toISOString(),
                revoked_by: revokedBy,
                revoke_reason: reason || "Revoked by user",
            })
            .eq("id", tokenId);

        if (error) throw error;
    }

    async getEquipmentTokens(equipmentId: string): Promise<QrToken[]> {
        const { data, error } = await this.supabase
            .from("machine_qr_tokens")
            .select("*")
            .eq("equipment_id", equipmentId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return (data || []) as QrToken[];
    }

    async getScanHistory(equipmentId: string, limit = 50): Promise<any[]> {
        const { data, error } = await this.supabase
            .from("qr_scan_logs")
            .select("*")
            .eq("equipment_id", equipmentId)
            .order("scanned_at", { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    private async logScan(tokenCleartext: string, result: QrScanResult, userId?: string): Promise<void> {
        try {
            const prefix = tokenCleartext.substring(0, 8);
            const { data: token } = await this.supabase
                .from("machine_qr_tokens")
                .select("id, equipment_id")
                .eq("token_prefix", prefix)
                .single();

            if (!token) return;

            await this.supabase.from("qr_scan_logs").insert({
                qr_token_id: token.id,
                equipment_id: token.equipment_id,
                scanned_by: userId || null,
                access_granted: result.is_valid,
                denial_reason: result.denial_reason || null,
            });
        } catch (error) {
            console.error("Failed to log QR scan:", error);
        }
    }
}

let qrTokenInstance: QrTokenService | null = null;

export function getQrTokenService(): QrTokenService {
    if (!qrTokenInstance) {
        qrTokenInstance = new QrTokenService();
    }
    return qrTokenInstance;
}
