// src/services/userService.ts
// ============================================================================
// USER SERVICE — replaces old userService.ts
// ============================================================================
// Changes:
//   - Removed: tenant_id, UserRole (admin/supervisor/technician)
//   - Now: role comes from organization_memberships, not profiles
//   - getUsersByTenant() → getOrganizationMembers() (in organizationService)
//   - Role management is per-organization, not global
//   - Profile is just personal info, no role field
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    language: string;
    timezone: string;
    default_organization_id: string | null;
    last_sign_in_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface UpdateProfileParams {
    first_name?: string;
    last_name?: string;
    display_name?: string;
    phone?: string;
    avatar_url?: string;
    language?: string;
    timezone?: string;
}

export const userService = {

    async getCurrentProfile(): Promise<UserProfile | null> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching current profile:', error);
            return null;
        }
    },

    async getUserById(id: string): Promise<UserProfile | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    },

    async updateProfile(updates: UpdateProfileParams): Promise<UserProfile | null> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating profile:', error);
            return null;
        }
    },

    async updateAvatar(file: File): Promise<string | null> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const ext = file.name.split('.').pop();
            const path = `avatars/${user.id}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(path, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(path);

            await this.updateProfile({ avatar_url: publicUrl });
            return publicUrl;
        } catch (error) {
            console.error('Error updating avatar:', error);
            return null;
        }
    },

    async setDefaultOrganization(organizationId: string): Promise<boolean> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { error } = await supabase
                .from('profiles')
                .update({ default_organization_id: organizationId })
                .eq('id', user.id);

            return !error;
        } catch {
            return false;
        }
    },
};