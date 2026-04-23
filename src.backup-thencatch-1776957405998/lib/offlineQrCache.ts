export interface CachedQrTokenData {
    equipment_id: string;
    allowed_views?: string[] | null;
    max_permission_level?: string | null;
    is_active: boolean;
    expires_at?: string | null;
}

export interface OfflineQrValidationResult {
    is_valid: boolean;
    equipment_id?: string;
    allowed_views?: string[];
    max_permission_level?: string | null;
    denial_reason?: string;
}

function cacheKey(tokenCleartext: string) {
    return `qr_cache_${tokenCleartext.substring(0, 8)}`;
}

export function cacheQrTokenForOffline(tokenCleartext: string, tokenData: CachedQrTokenData): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
        cacheKey(tokenCleartext),
        JSON.stringify({ token: tokenData, cachedAt: new Date().toISOString() })
    );
}

export function validateCachedQrToken(tokenCleartext: string): OfflineQrValidationResult | null {
    if (typeof window === "undefined") return null;

    try {
        const cached = window.localStorage.getItem(cacheKey(tokenCleartext));
        if (!cached) return null;

        const { token, cachedAt } = JSON.parse(cached);
        const cacheAge = Date.now() - new Date(cachedAt).getTime();
        if (cacheAge > 24 * 60 * 60 * 1000) return null;

        if (token.expires_at && new Date(token.expires_at) < new Date()) {
            return { is_valid: false, denial_reason: "expired" };
        }

        if (!token.is_active) {
            return { is_valid: false, denial_reason: "revoked" };
        }

        return {
            is_valid: true,
            equipment_id: token.equipment_id,
            allowed_views: Array.isArray(token.allowed_views) ? token.allowed_views : [],
            max_permission_level: token.max_permission_level || null,
        };
    } catch {
        return null;
    }
}
