// src/services/platformService.ts
// ============================================================================
// PLATFORM SERVICE — replaces old platformService.ts
// ============================================================================
// Changes:
//   - Uses real platform_admins table instead of JWT claims
//   - Simplified: no impersonation system (future feature)
//   - Backed by is_platform_admin() SQL function
//   - Organization CRUD for platform admins
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Organization } from './organizationService';

export const platformService = {

    // ─── AUTH CHECK ──────────────────────────────────────────────────────

    async isPlatformAdmin(): Promise<boolean> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { data, error } = await supabase
                .from('platform_admins')
                .select('id')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();

            return !!data && !error;
        } catch {
            return false;
        }
    },

    // ─── ORGANIZATION MANAGEMENT ─────────────────────────────────────────

    async getAllOrganizations(): Promise<Organization[]> {
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .order('name');

        if (error) return [];
        return data || [];
    },

    async getOrganizationStats(): Promise<{
        total: number;
        byType: Record<string, number>;
        byStatus: Record<string, number>;
    }> {
        const { data, error } = await supabase
            .from('organizations')
            .select('type, subscription_status');

        if (error || !data) return { total: 0, byType: {}, byStatus: {} };

        const byType: Record<string, number> = {};
        const byStatus: Record<string, number> = {};

        data.forEach(org => {
            byType[org.type] = (byType[org.type] || 0) + 1;
            byStatus[org.subscription_status] = (byStatus[org.subscription_status] || 0) + 1;
        });

        return { total: data.length, byType, byStatus };
    },

    // ─── PLATFORM USER MANAGEMENT ────────────────────────────────────────

    async getPlatformAdmins(): Promise<any[]> {
        const { data, error } = await supabase
            .from('platform_admins')
            .select(`
                *,
                user:profiles (id, display_name, email)
            `)
            .eq('is_active', true);

        if (error) return [];
        return data || [];
    },

    async addPlatformAdmin(userId: string, notes?: string): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('platform_admins')
            .insert({
                user_id: userId,
                granted_by: user?.id,
                notes: notes || null,
            });

        return !error;
    },

    async removePlatformAdmin(userId: string): Promise<boolean> {
        const { error } = await supabase
            .from('platform_admins')
            .update({ is_active: false })
            .eq('user_id', userId);

        return !error;
    },

    // ─── IMPERSONATION (future feature) ──────────────────────────────────

    async isImpersonating(): Promise<{ active: boolean; originalUser?: any }> {
        // Non implementato - feature futura
        return { active: false };
    },

    async stopImpersonation(): Promise<void> {
        // Non implementato - feature futura
    },
};