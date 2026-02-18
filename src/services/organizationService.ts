/// src/services/organizationService.ts
// ============================================================================
// ORGANIZATION SERVICE — connects to real organizations + memberships tables
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type OrgType = 'manufacturer' | 'customer' | 'enterprise';
export type OrgRole = 'owner' | 'admin' | 'plant_manager' | 'technician' | 'viewer';

export interface Organization {
    id: string;
    name: string;
    slug: string;
    type: OrgType;
    email: string | null;
    phone: string | null;
    website: string | null;
    vat_number: string | null;
    fiscal_code: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    province: string | null;
    postal_code: string | null;
    country: string | null;
    logo_url: string | null;
    subscription_status: string;
    subscription_plan: string;
    max_users: number;
    max_plants: number;
    max_machines: number;
    settings: Record<string, any>;
    is_archived: boolean;
    created_at: string;
    updated_at: string;
}

export interface OrganizationMembership {
    id: string;
    organization_id: string;
    user_id: string;
    role: OrgRole;
    invited_by: string | null;
    invited_at: string | null;
    accepted_at: string | null;
    is_active: boolean;
    created_at: string;
}

export interface OrganizationWithMembership extends Organization {
    membership?: OrganizationMembership;
}

export interface CreateOrganizationParams {
    name: string;
    slug: string;
    type: OrgType;
    email?: string;
    phone?: string;
}

export interface InviteMemberParams {
    organizationId: string;
    email: string;
    role: OrgRole;
}

// ============================================================================
// ROLE HIERARCHY
// ============================================================================

const ROLE_RANK: Record<OrgRole, number> = {
    owner: 5,
    admin: 4,
    plant_manager: 3,
    technician: 2,
    viewer: 1,
};

export function hasMinimumRole(userRole: OrgRole, requiredRole: OrgRole): boolean {
    return ROLE_RANK[userRole] >= ROLE_RANK[requiredRole];
}

// ============================================================================
// SERVICE
// ============================================================================

export const organizationService = {

    // ─── CREATE ──────────────────────────────────────────────────────────

    async createOrganization(
        params: CreateOrganizationParams
    ): Promise<{ organizationId: string | null; error: Error | null }> {
        try {
            const { data, error } = await supabase.rpc('create_organization_with_owner', {
                p_name: params.name,
                p_slug: params.slug,
                p_type: params.type,
                p_email: params.email || null,
                p_phone: params.phone || null,
            });

            if (error) throw error;
            return { organizationId: data as string, error: null };
        } catch (error) {
            console.error('Error creating organization:', error);
            return { organizationId: null, error: error as Error };
        }
    },

    async generateUniqueSlug(name: string): Promise<string> {
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        let counter = 0;
        while (counter < 10) {
            const checkSlug = counter === 0 ? slug : `${slug}-${counter}`;

            const { data, error } = await supabase
                .from('organizations')
                .select('id')
                .eq('slug', checkSlug)
                .maybeSingle();

            if (!data) {
                return checkSlug;
            }
            counter++;
        }
        return `${slug}-${Date.now()}`;
    },

    // ─── READ ────────────────────────────────────────────────────────────

    async getCurrentOrganization(): Promise<Organization | null> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            // Get user's default org from profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('default_organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.default_organization_id) {
                // Fallback: get first active membership
                const { data: membership } = await supabase
                    .from('organization_memberships')
                    .select('organization_id')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .limit(1)
                    .single();

                if (!membership) return null;

                const { data: org } = await supabase
                    .from('organizations')
                    .select('*')
                    .eq('id', membership.organization_id)
                    .single();

                return org;
            }

            const { data, error } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', profile.default_organization_id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching current organization:', error);
            return null;
        }
    },

    async getOrganizationById(id: string): Promise<Organization | null> {
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    },

    async getUserOrganizations(): Promise<OrganizationWithMembership[]> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data: memberships, error } = await supabase
                .from('organization_memberships')
                .select(`
                    *,
                    organizations (*)
                `)
                .eq('user_id', user.id)
                .eq('is_active', true);

            if (error) throw error;

            return (memberships || []).map((m: any) => ({
                ...m.organizations,
                membership: {
                    id: m.id,
                    organization_id: m.organization_id,
                    user_id: m.user_id,
                    role: m.role,
                    invited_by: m.invited_by,
                    invited_at: m.invited_at,
                    accepted_at: m.accepted_at,
                    is_active: m.is_active,
                    created_at: m.created_at,
                },
            }));
        } catch (error) {
            console.error('Error fetching user organizations:', error);
            return [];
        }
    },

    // ─── MEMBERSHIP ──────────────────────────────────────────────────────

    async getCurrentMembership(organizationId: string): Promise<OrganizationMembership | null> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('organization_memberships')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('user_id', user.id)
                .eq('is_active', true)
                .single();

            if (error) return null;
            return data;
        } catch {
            return null;
        }
    },

    async getOrganizationMembers(organizationId: string): Promise<(OrganizationMembership & { profile: any })[]> {
        const { data, error } = await supabase
            .from('organization_memberships')
            .select(`
                *,
                profile:profiles (id, first_name, last_name, display_name, email, avatar_url)
            `)
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .order('role');

        if (error) {
            console.error('Error fetching members:', error);
            return [];
        }
        return data || [];
    },

    async updateMemberRole(membershipId: string, newRole: OrgRole): Promise<boolean> {
        const { error } = await supabase
            .from('organization_memberships')
            .update({ role: newRole })
            .eq('id', membershipId);

        return !error;
    },

    async removeMember(membershipId: string): Promise<boolean> {
        const { error } = await supabase
            .from('organization_memberships')
            .update({ is_active: false, deactivated_at: new Date().toISOString() })
            .eq('id', membershipId);

        return !error;
    },

    // ─── UPDATE ──────────────────────────────────────────────────────────

    async updateOrganization(
        id: string,
        updates: Partial<Organization>
    ): Promise<Organization | null> {
        const { data, error } = await supabase
            .from('organizations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating organization:', error);
            return null;
        }
        return data;
    },

    // ─── SWITCH ──────────────────────────────────────────────────────────

    async switchOrganization(organizationId: string): Promise<boolean> {
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