import { supabase } from '@/integrations/supabase/client';
import { hasMinimumOrgRole, normalizeOrgRole, type RealOrgRole as OrgRole, type RoleLike } from '@/lib/roles';

export type OrgType = 'manufacturer' | 'customer' | 'enterprise';

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

export interface MembershipWithOrganization extends OrganizationMembership {
    organization: Pick<Organization, 'id' | 'name' | 'type' | 'slug'> | null;
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

function normalizeOrgType(value: string): OrgType {
    if (value === 'manufacturer' || value === 'customer' || value === 'enterprise') {
        return value;
    }
    return 'customer';
}

function normalizeIncomingOrgType(value: string): OrgType {
    const raw = String(value ?? '').toLowerCase();
    if (raw === 'manufacturer') return 'manufacturer';
    if (raw === 'enterprise') return 'enterprise';
    if (raw === 'company' || raw === 'customer') return 'customer';
    return 'customer';
}

export function hasMinimumRole(userRole: RoleLike, requiredRole: OrgRole): boolean {
    return hasMinimumOrgRole(userRole, requiredRole);
}

export const organizationService = {
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
            return { organizationId: (data as string) ?? null, error: null };
        } catch (error) {
            console.error('Error creating organization:', error);
            return { organizationId: null, error: error as Error };
        }
    },

    async createOrganizationWithOwner(
        params: Omit<CreateOrganizationParams, 'type'> & { type: CreateOrganizationParams['type'] | 'company' }
    ) {
        return this.createOrganization({
            ...params,
            type: normalizeIncomingOrgType(params.type),
        });
    },

    async generateUniqueSlug(name: string): Promise<string> {
        const slugBase = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || 'organization';

        let counter = 0;
        while (counter < 10) {
            const checkSlug = counter === 0 ? slugBase : `${slugBase}-${counter}`;

            const { data } = await supabase
                .from('organizations')
                .select('id')
                .eq('slug', checkSlug)
                .maybeSingle();

            if (!data) return checkSlug;
            counter += 1;
        }

        return `${slugBase}-${Date.now()}`;
    },

    async getCurrentOrganization(): Promise<Organization | null> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data: profile } = await supabase
                .from('profiles')
                .select('default_organization_id')
                .eq('id', user.id)
                .single();

            let organizationId = profile?.default_organization_id ?? null;

            if (!organizationId) {
                const { data: membership } = await supabase
                    .from('organization_memberships')
                    .select('organization_id')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .order('created_at', { ascending: true })
                    .limit(1)
                    .maybeSingle();

                organizationId = membership?.organization_id ?? null;
            }

            if (!organizationId) return null;

            const { data, error } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', organizationId)
                .single();

            if (error) throw error;
            return data as Organization;
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
        return data as Organization;
    },

    async getUserOrganizations(): Promise<OrganizationWithMembership[]> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data: memberships, error } = await supabase
                .from('organization_memberships')
                .select(`
                    id,
                    organization_id,
                    user_id,
                    role,
                    invited_by,
                    invited_at,
                    accepted_at,
                    is_active,
                    created_at,
                    organizations (*)
                `)
                .eq('user_id', user.id)
                .eq('is_active', true);

            if (error) throw error;

            return (memberships || []).map((row: any) => ({
                ...(row.organizations as Organization),
                membership: {
                    id: row.id,
                    organization_id: row.organization_id,
                    user_id: row.user_id,
                    role: (normalizeOrgRole(row.role) ?? "technician") as OrgRole,
                    invited_by: row.invited_by,
                    invited_at: row.invited_at,
                    accepted_at: row.accepted_at,
                    is_active: row.is_active,
                    created_at: row.created_at,
                },
            }));
        } catch (error) {
            console.error('Error fetching user organizations:', error);
            return [];
        }
    },

    async getActiveMemberships(): Promise<MembershipWithOrganization[]> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('organization_memberships')
                .select(`
                    id,
                    organization_id,
                    user_id,
                    role,
                    invited_by,
                    invited_at,
                    accepted_at,
                    is_active,
                    created_at,
                    organizations (id, name, type, slug)
                `)
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return (data || []).map((row: any) => ({
                id: row.id,
                organization_id: row.organization_id,
                user_id: row.user_id,
                role: (normalizeOrgRole(row.role) ?? "technician") as OrgRole,
                invited_by: row.invited_by,
                invited_at: row.invited_at,
                accepted_at: row.accepted_at,
                is_active: row.is_active,
                created_at: row.created_at,
                organization: row.organizations
                    ? {
                        id: row.organizations.id,
                        name: row.organizations.name,
                        slug: row.organizations.slug,
                        type: normalizeOrgType(row.organizations.type),
                    }
                    : null,
            }));
        } catch (error) {
            console.error('Error fetching active memberships:', error);
            return [];
        }
    },

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
            return data ? ({ ...data, role: (normalizeOrgRole(data.role) ?? "technician") as OrgRole } as OrganizationMembership) : null;
        } catch {
            return null;
        }
    },

    async getUserRole(organizationId: string): Promise<OrgRole | null> {
        const membership = await this.getCurrentMembership(organizationId);
        return membership?.role ?? null;
    },

    async getOrganizationMembers(organizationId: string): Promise<(OrganizationMembership & { profile: any })[]> {
        const { data, error } = await supabase
            .from('organization_memberships')
            .select(`
                id,
                organization_id,
                user_id,
                role,
                invited_by,
                invited_at,
                accepted_at,
                is_active,
                created_at,
                profile:profiles (id, first_name, last_name, display_name, email, avatar_url)
            `)
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .order('role');

        if (error) {
            console.error('Error fetching members:', error);
            return [];
        }

        return (data || []) as (OrganizationMembership & { profile: any })[];
    },

    async hasCompletedOnboarding(): Promise<boolean> {
        const organizations = await this.getUserOrganizations();
        return organizations.length > 0;
    },

    async completeOnboarding(organizationId?: string): Promise<boolean> {
        try {
            if (!organizationId) {
                const org = await this.getCurrentOrganization();
                organizationId = org?.id;
            }

            if (!organizationId) return false;
            return await this.switchOrganization(organizationId);
        } catch (error) {
            console.error('Error completing onboarding:', error);
            return false;
        }
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
        return data as Organization;
    },

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

